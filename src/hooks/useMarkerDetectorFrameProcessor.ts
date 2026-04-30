import {useMemo, useState} from 'react';
import {useFrameProcessor, VisionCameraProxy} from 'react-native-vision-camera';
import {useRunOnJS} from 'react-native-worklets-core';

type MarkerDetectionResult = {
  detected?: boolean;
  imageBase64?: string;
  timestamp?: number;
};

export const useMarkerDetectorFrameProcessor = () => {
  const plugin = useMemo(() => VisionCameraProxy.initFrameProcessorPlugin('markerDetector', {}), []);
  const [resultState, setResultState] = useState<MarkerDetectionResult>({detected: false, imageBase64: '', timestamp: 0});
  const setResultJS = useRunOnJS(setResultState, []);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (plugin == null) {
        return;
      }

      const pluginResult = plugin.call(frame, {}) as MarkerDetectionResult | undefined;
      if (pluginResult?.detected && typeof pluginResult.imageBase64 === 'string' && pluginResult.imageBase64.length > 0) {
        setResultJS({
          detected: true,
          imageBase64: pluginResult.imageBase64,
          timestamp: Date.now(),
        });
      }
    },
    [plugin, setResultJS],
  );

  return {
    frameProcessor,
    result: {
      value: resultState,
    },
  };
};


