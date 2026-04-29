import os
import time
import requests
import operator
from typing import TypedDict, Annotated, List

from django.conf import settings

from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END


# =========================
# LLM + Embeddings
# =========================
def _get_llm():
    # Create lazily so env/.env changes take effect after restart
    return ChatGroq(
        api_key=settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY"),
        model="llama-3.1-8b-instant",
        temperature=0.1,
        max_tokens=1024
    )

API_DELAY = float(os.getenv("RAG_API_DELAY", "0.1"))


# =========================
# Safe request helper
# =========================
def safe_request(url, params=None):
    try:
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            return res.json()
    except Exception:
        return None


# =========================
# API Fetchers
# =========================
def fetch_ncbi_gene(gene):
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "gene",
        "term": gene,
        "retmode": "json"
    }
    res = safe_request(url, params=params)

    if not res or not res["esearchresult"]["idlist"]:
        return None

    gene_id = res["esearchresult"]["idlist"][0]

    summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

    return safe_request(summary_url, params={
        "db": "gene",
        "id": gene_id,
        "retmode": "json"
    })


def fetch_pubmed(gene):
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"

    params = {
        "db": "pubmed",
        "term": f"{gene} lung cancer",
        "retmax": 5,
        "retmode": "json"
    }

    res = safe_request(url, params=params)
    if not res:
        return []
    return res.get("esearchresult", {}).get("idlist", [])


def fetch_ebi_protein(gene):
    url = f"https://www.ebi.ac.uk/proteins/api/proteins/{gene}"

    headers = {"Accept": "application/json"}

    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()
    except:
        pass

    return None


def fetch_drugbank(gene):
    url = f"https://dgidb.org/api/v2/interactions.json?genes={gene}"

    res = safe_request(url)

    if not res:
        return []

    drugs = []

    for match in res.get("matchedTerms", []):
        for interaction in match.get("interactions", []):
            drugs.append(interaction.get("drugName"))

    return drugs


def normalize_data(gene, ncbi, ebi, papers):
    return {
        "gene": gene,
        "gene_summary": str(ncbi)[:500] if ncbi else "",
        "protein_info": str(ebi)[:500] if ebi else "",
        "papers": papers[:5]
    }


# =========================
# State Schema
# =========================
class AgentState(TypedDict):
    gene: str
    shap_score: float
    drug_candidates: List[str]

    gene_context: str
    pathway_context: str
    drug_context: str
    literature_context: str

    gene_report: str
    pathway_report: str
    drug_report: str
    literature_report: str

    final_report: str
    messages: Annotated[List, operator.add]


# =========================
# Agents
# =========================
def gene_agent(state):
    prompt = f"Analyze the biological role of gene {state['gene']} in lung cancer."
    result = _get_llm().invoke(prompt)
    state["gene_report"] = result.content
    return state


def pathway_agent(state):
    prompt = f"Explain pathways involving gene {state['gene']} in cancer."
    result = _get_llm().invoke(prompt)
    state["pathway_report"] = result.content
    return state


def drug_agent(state):
    prompt = f"Analyze therapeutic drugs targeting {state['gene']}: {state['drug_candidates']}"
    result = _get_llm().invoke(prompt)
    state["drug_report"] = result.content
    return state


def literature_agent(state):
    prompt = f"Summarize literature evidence for gene {state['gene']} in lung cancer."
    result = _get_llm().invoke(prompt)
    state["literature_report"] = result.content
    return state


def aggregator_agent(state):
    prompt = f"""
    Combine the following into one clinical biomarker report:

    Gene report:
    {state['gene_report']}

    Pathway report:
    {state['pathway_report']}

    Drug report:
    {state['drug_report']}

    Literature report:
    {state['literature_report']}
    """
    result = _get_llm().invoke(prompt)
    state["final_report"] = result.content
    return state


# =========================
# Graph
# =========================
graph = StateGraph(AgentState)

graph.add_node("gene_agent", gene_agent)
graph.add_node("pathway_agent", pathway_agent)
graph.add_node("drug_agent", drug_agent)
graph.add_node("literature_agent", literature_agent)
graph.add_node("aggregator_agent", aggregator_agent)

graph.set_entry_point("gene_agent")

graph.add_edge("gene_agent", "pathway_agent")
graph.add_edge("pathway_agent", "drug_agent")
graph.add_edge("drug_agent", "literature_agent")
graph.add_edge("literature_agent", "aggregator_agent")
graph.add_edge("aggregator_agent", END)

app = graph.compile()


# =========================
# Runner
# =========================
def run_langgraph_pipeline(gene, shap_score, drug_candidates):
    ncbi = fetch_ncbi_gene(gene)
    time.sleep(API_DELAY)

    ebi = fetch_ebi_protein(gene)
    time.sleep(API_DELAY)

    papers = fetch_pubmed(gene)

    context = normalize_data(gene, ncbi, ebi, papers)

    initial_state = {
        "gene": gene,
        "shap_score": shap_score,
        "drug_candidates": drug_candidates,
        "gene_context": str(context),
        "pathway_context": "",
        "drug_context": "",
        "literature_context": "",
        "gene_report": "",
        "pathway_report": "",
        "drug_report": "",
        "literature_report": "",
        "final_report": "",
        "messages": []
    }

    result = app.invoke(initial_state)

    return result["final_report"]