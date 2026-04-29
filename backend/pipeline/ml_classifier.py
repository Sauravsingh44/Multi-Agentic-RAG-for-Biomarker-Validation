import requests
from django.conf import settings

class MLClassifier:
    def __init__(self):
        self.lung_url="https://rishabh108272-lung-cancer-subtype.hf.space/predict"
    
    def predict_lung_subtype(self, features):
        try:
            response=requests.post(
                self.lung_url,
                json={"features":features},
                timeout=60
            ) 
            
            response.raise_for_status()
            result=response.json()
            
            return {
                "predicted_subtype":result.get("label"),
                "confidence":result.get("confidence"),
                "probability":result.get("probability")
            }
            
        except Exception as e:
            raise Exception(f"Lung Prediction failed:{str(e)}")
        