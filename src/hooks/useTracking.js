import { useEffect } from "react";
import { analyticsService } from "../services/analyticsService";

export function useTracking(featureName, options = {}) {
  useEffect(() => {
    if (featureName) {
      analyticsService.trackFeature(featureName, options);
    }
  }, [featureName]);
}

export default useTracking;
