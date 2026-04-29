import io
import numpy as np
import pandas as pd
from celery import shared_task
from django.utils import timezone

from .models import (
    PatientAnalysis,
    XAIResult,
    DrugCandidate,
    AgentReport,
    PatientSummaryReport
)

from .ml_classifier import MLClassifier
from .xai_engine import XAIEngine
from .gene_mapper import GeneMapper
from .drug_engine import DrugRepurposingEngine


@shared_task
def run_full_pipeline(analysis_id, csv_data):
    try:
        analysis = PatientAnalysis.objects.get(id=analysis_id)

        # =========================
        # STEP 1: Parse CSV
        # =========================
        analysis.status = "RUNNING"
        analysis.current_step = "Parsing CSV"
        analysis.current_step_number = 1
        analysis.save()

        df = pd.read_csv(io.StringIO(csv_data))

        patient_id = df.iloc[0]["PatientID"]
        feature_names = list(df.columns[1:])
        feature_vector = df.iloc[:, 1:].values.astype(float)

        analysis.patient_id = patient_id
        analysis.save()

        # =========================
        # STEP 2: ML Prediction
        # =========================
        analysis.current_step = "Predicting subtype"
        analysis.current_step_number = 2
        analysis.save()

        classifier = MLClassifier()
        prediction = classifier.predict_lung_subtype(feature_vector.flatten().tolist())

        analysis.predicted_subtype = prediction["predicted_subtype"]

        if prediction["predicted_subtype"] == "LUAD":
            analysis.luad_confidence = prediction["confidence"]
            analysis.lusc_confidence = 100 - prediction["confidence"]
        else:
            analysis.lusc_confidence = prediction["confidence"]
            analysis.luad_confidence = 100 - prediction["confidence"]

        analysis.save()

        # =========================
        # STEP 3: SHAP + LIME
        # =========================
        analysis.current_step = "Running SHAP + LIME Analysis"
        analysis.current_step_number = 3
        analysis.save()

        classifier = MLClassifier()
        def real_predict(features):
            return classifier.predict_lung_subtype(features)['confidence']

        xai_engine = XAIEngine(lambda x: np.array([[real_predict(row.tolist())] for row in x]))

        shap_results = xai_engine.run_shap_analysis(
            feature_vector,
            feature_names
        )

        lime_results = xai_engine.run_lime_analysis(
            feature_vector,
            feature_names
        )

        merged_results = xai_engine.merge_results(
            shap_results,
            lime_results
        )

        # =========================
        # STEP 4: Gene Mapping
        # =========================
        analysis.current_step = "Mapping genes"
        analysis.current_step_number = 4
        analysis.save()

        mapper = GeneMapper()
        mapped_results = mapper.map_xai_results(merged_results)

        for item in mapped_results:
            XAIResult.objects.create(
                analysis=analysis,
                gene_index=feature_names.index(item["gene"]),
                gene_symbol=item["gene_symbol"],
                shap_value=item["shap_value"],
                lime_weight=item["lime_weight"],
                shap_direction="up" if item["shap_value"] > 0 else "down",
                lime_direction="positive" if item["lime_weight"] > 0 else "negative",
                high_confidence=item["high_confidence"]
            )

        analysis.total_genes_analyzed = len(mapped_results)
        analysis.save()

        # =========================
        # STEP 5: Drug Repurposing
        # =========================
        analysis.current_step = "Finding Drug Candidates"
        analysis.current_step_number = 5
        analysis.save()

        top_genes = [x["gene_symbol"] for x in mapped_results[:10]]

        drug_engine = DrugRepurposingEngine()
        drug_candidates = drug_engine.get_top_drug_candidates(top_genes)

        for gene, drugs in drug_candidates.items():
            for drug in drugs:
                DrugCandidate.objects.create(
                    analysis=analysis,
                    gene_symbol=gene,
                    drug_name=drug.get("drug_name"),
                    chembl_id=drug.get("concept_id", ""),
                    mechanism=", ".join(drug.get("types", [])),
                    action_type="Drug-Gene Interaction",
                    max_phase=0
                )

        # =========================
        # STEP 6: Multi-Agentic RAG
        # =========================
        analysis.current_step = "Running Multi-Agentic RAG"
        analysis.current_step_number = 6
        analysis.save()

        reports = []

        for item in mapped_results[:5]:
            gene = item["gene_symbol"]

            drugs_for_gene = [
                d.get("drug_name")
                for d in drug_candidates.get(gene, [])
            ]

            try:
                from .langgraph_pipeline import run_langgraph_pipeline
                final_report = run_langgraph_pipeline(
                    gene=gene,
                    shap_score=item["shap_value"],
                    drug_candidates=drugs_for_gene
                )
            except Exception as rag_exc:
                final_report = (
                    f"RAG report unavailable for {gene}: {rag_exc}. "
                    "Set GROQ_API_KEY to enable multi-agent reports."
                )

            AgentReport.objects.create(
                analysis=analysis,
                gene_symbol=gene,
                agent_name="aggregator",
                report_text=final_report
            )

            reports.append({
                "gene": gene,
                "report": final_report
            })

        # =========================
        # STEP 7: Summary
        # =========================
        analysis.current_step = "Generating Summary"
        analysis.current_step_number = 7
        analysis.save()

        summary_text = f"""
        Predicted subtype: {analysis.predicted_subtype}
        Total biomarkers analyzed: {analysis.total_genes_analyzed}
        Top genes: {top_genes[:5]}
        """

        # Build results matching frontend AnalysisResults shape
        driver_genes = []
        for xai in XAIResult.objects.filter(analysis=analysis)[:8]:
            driver_genes.append({
                "index": xai.gene_index,
                "symbol": xai.gene_symbol,
                "shap": float(xai.shap_value),
                "lime": float(xai.lime_weight),
                "confidence": 0.85 if xai.high_confidence else 0.75,
                "direction": xai.shap_direction
            })

        drug_candidates_list = []
        for dc in DrugCandidate.objects.filter(analysis=analysis):
            drug_candidates_list.append({
                "gene": dc.gene_symbol,
                "drug": dc.drug_name,
                "mechanism": dc.mechanism,
                "phase": "FDA Approved" if dc.max_phase >= 3 else f"Phase {dc.max_phase}",
                "chemblId": dc.chembl_id
            })

        agent_reports = []
        for agent in AgentReport.objects.filter(analysis=analysis):
            agent_reports.append({
                "gene": agent.gene_symbol,
                "sections": [{"title": agent.agent_name, "content": agent.report_text}]
            })

        subtype_scores = [
            {"name": analysis.predicted_subtype, "value": float(getattr(analysis, f'{analysis.predicted_subtype.lower()}confidence', 92.4))},
            {"name": "LUSC" if analysis.predicted_subtype == "LUAD" else "LUAD", "value": float(getattr(analysis, f'l{analysis.predicted_subtype.lower()}confidence', 7.6))}
        ]

        results_data = {
            "subtype": analysis.predicted_subtype,
            "confidence": float(getattr(analysis, f'{analysis.predicted_subtype.lower()}confidence', 0.924)),
            "subtypeScores": subtype_scores,
            "driverGenes": driver_genes,
            "drugCandidates": drug_candidates_list,
            "agentReports": agent_reports,
            "summary": {
                "patientId": analysis.patient_id,
                "subtype": analysis.predicted_subtype,
                "topGenes": top_genes[:5] if 'top_genes' in locals() else [],
                "topDrugs": list(set([d.drug_name for d in DrugCandidate.objects.filter(analysis=analysis)[:5]])),
                "clinicalRecommendations": ["Consult oncologist.", "Real data now flows!"]
            }
        }

        analysis.results = results_data
        analysis.status = "COMPLETE"
        analysis.completed_at = timezone.now()
        analysis.current_step = "Completed"
        analysis.save()

        PatientSummaryReport.objects.create(
            analysis=analysis,
            summary_text=summary_text,
            top_genes=top_genes[:5] if 'top_genes' in locals() else [],
            top_drugs=dict(drug_candidates) if 'drug_candidates' in locals() else {},
            clinical_recommendations="Consult oncologist for further validation."
        )

        return {
            "status": "COMPLETE",
            "analysis_id": str(analysis.id)
        }

    except Exception as e:
        try:
            analysis = PatientAnalysis.objects.get(id=analysis_id)
            analysis.status = "FAILED"
            analysis.error_message = str(e)
            analysis.save()
        except:
            pass

        return {
            "status": "FAILED",
            "error": str(e)
        }