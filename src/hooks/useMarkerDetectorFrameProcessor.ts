import { useMemo } from 'react';
import { useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';

export const useMarkerDetectorFrameProcessor = () => {
  const plugin = useMemo(
    () => VisionCameraProxy.initFrameProcessorPlugin('markerDetector', {}),
    []
  );

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (plugin == null) return;
    void plugin.call(frame, {});
  }, [plugin]);

  return { frameProcessor };
};
