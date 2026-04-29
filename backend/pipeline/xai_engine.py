import numpy as np
import pandas as pd
import shap
from lime.lime_tabular import LimeTabularExplainer


class XAIEngine:
    def __init__(self, model_predict_function):
        self.model_predict_function = model_predict_function

    def run_shap_analysis(self, feature_vector, feature_names):
        """
        feature_vector: np.array shape (1, n_features)
        """
        try:
            background = np.repeat(feature_vector, 10, axis=0)

            explainer = shap.KernelExplainer(
                self.model_predict_function,
                background
            )

            shap_values = explainer.shap_values(feature_vector)

            if isinstance(shap_values, list):
                shap_matrix = np.mean([np.abs(sv) for sv in shap_values], axis=0)
            else:
                shap_matrix = np.abs(shap_values)

                if shap_matrix.ndim == 3:
                    shap_matrix = shap_matrix.mean(axis=-1)

            importance = shap_matrix[0]

            importance_df = pd.DataFrame({
                "gene": feature_names,
                "shap_value": importance
            }).sort_values("shap_value", ascending=False)

            return importance_df.head(10).to_dict(orient="records")

        except Exception as e:
            raise Exception(f"SHAP failed: {str(e)}")

    def run_lime_analysis(self, feature_vector, feature_names):
        try:
            explainer = LimeTabularExplainer(
                training_data=np.repeat(feature_vector, 10, axis=0),
                feature_names=feature_names,
                mode='classification'
            )

            exp = explainer.explain_instance(
                feature_vector[0],
                self.model_predict_function,
                num_features=10
            )

            lime_results = []

            for feature, weight in exp.as_list():
                lime_results.append({
                    "gene": feature,
                    "lime_weight": weight
                })

            return lime_results

        except Exception as e:
            raise Exception(f"LIME failed: {str(e)}")

    def merge_results(self, shap_results, lime_results):
        merged = []

        for shap_item in shap_results:
            gene = shap_item["gene"]

            lime_match = next(
                (x for x in lime_results if gene in x["gene"]),
                None
            )

            merged.append({
                "gene": gene,
                "shap_value": shap_item["shap_value"],
                "lime_weight": lime_match["lime_weight"] if lime_match else 0,
                "high_confidence": True
            })

        return merged