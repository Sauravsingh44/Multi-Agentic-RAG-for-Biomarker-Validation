import uuid
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import PatientAnalysis
from .serializers import PatientAnalysisSerializer

@api_view(['POST'])
def analyze_csv(request):
    file = request.FILES.get('file')
    classifier_type = str(request.data.get('classifier_type', 'lung')).strip().lower()
    if not file or not file.name.endswith('.csv'):
        return Response({"error": "CSV file required"}, status=400)
    if classifier_type not in {"lung", "colorectal"}:
        return Response({"error": "Invalid classifier_type. Use 'lung' or 'colorectal'."}, status=400)
    
    patient_id = f"PATIENT-{uuid.uuid4().hex[:8]}"
    analysis = PatientAnalysis.objects.create(
        patient_id=patient_id,
        status='PENDING',
        current_step='Queued'
    )
    
    # Read CSV content and trigger Celery
    csv_content = file.read().decode('utf-8')
    from .tasks import run_full_pipeline
    try:
        run_full_pipeline.delay(str(analysis.id), csv_content, classifier_type)
    except Exception as exc:
        # If broker (Redis/Celery) is unavailable in local dev, run inline
        # so API calls don't fail with 500 at upload time.
        analysis.current_step = "Processing (no broker)"
        analysis.error_message = f"Celery unavailable, ran inline: {exc}"
        analysis.save(update_fields=["current_step", "error_message"])
        run_full_pipeline(str(analysis.id), csv_content, classifier_type)
    
    serializer = PatientAnalysisSerializer(analysis)
    return Response(serializer.data)
    
@api_view(['GET'])
def analysis_status(request, analysis_id):
    try:
        analysis = PatientAnalysis.objects.get(id=analysis_id)
        serializer = PatientAnalysisSerializer(analysis)
        return Response({
            "status": analysis.status,
            "current_step": analysis.current_step,
            "current_step_number": analysis.current_step_number,
            "total_steps": 7,
            "analysis": serializer.data
        })
    except PatientAnalysis.DoesNotExist:
        return Response({"error": "Analysis not found"}, status=404)

@api_view(['GET'])
def list_analyses(request):
    analyses = PatientAnalysis.objects.all().order_by('-created_at')[:10]
    serializer = PatientAnalysisSerializer(analyses, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
def clear_analyses(request):
    # Deletes all analyses; related rows are removed via FK cascade.
    deleted, _ = PatientAnalysis.objects.all().delete()
    return Response({"deleted": deleted})

@api_view(['GET'])
def analysis_results(request, analysis_id):
    try:
        analysis = PatientAnalysis.objects.get(id=analysis_id)
        serializer = PatientAnalysisSerializer(analysis)
        return Response(serializer.data)
    except PatientAnalysis.DoesNotExist:
        return Response({"error": "Analysis not found"}, status=404)

