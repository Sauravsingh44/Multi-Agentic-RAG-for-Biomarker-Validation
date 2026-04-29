import requests
from django.conf import settings
import time

class MLClassifier:
    def __init__(self):
        self.lung_url="https://rishabh108272-lung-cancer-subtype.hf.space/predict"
    
    def predict_lung_subtype(self, features):
        try:
            # Use an explicit (connect, read) timeout so we fail fast when the
            # remote service is down/unreachable (common during local dev).
            # Also retry a couple times on transient 5xx from the Space.
            last_exc = None
            for attempt in range(3):
                try:
                    response = requests.post(
                        self.lung_url,
                        json={"features": features},
                        timeout=(10, 60),
                    )

                    if response.status_code >= 500:
                        raise requests.HTTPError(
                            f"{response.status_code} Server Error for url: {self.lung_url}. "
                            f"Response: {response.text[:500]}",
                            response=response,
                        )

                    response.raise_for_status()
                    result = response.json()
                    break
                except Exception as exc:
                    last_exc = exc
                    # small backoff before retrying
                    time.sleep(0.6 * (attempt + 1))
            else:
                raise last_exc  # type: ignore[misc]
            
            return {
                "predicted_subtype":result.get("label"),
                "confidence":result.get("confidence"),
                "probability":result.get("probability")
            }
            
        except Exception as e:
            # Optional fallback for demos/local dev when the remote classifier is unstable.
            # Enable by setting LUNG_CLASSIFIER_FALLBACK=1 in environment.
            fallback_enabled = str(getattr(settings, "LUNG_CLASSIFIER_FALLBACK", "") or "").lower() in {"1", "true", "yes"}
            if fallback_enabled:
                # Deterministic heuristic: use sign of sum as a pseudo-classifier.
                s = float(sum(float(x) for x in features)) if features else 0.0
                label = "LUAD" if s >= 0 else "LUSC"
                return {"predicted_subtype": label, "confidence": 50.0, "probability": 0.5}

            raise Exception(f"Lung Prediction failed:{str(e)}")
        