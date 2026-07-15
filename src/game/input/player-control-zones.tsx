import { View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';

type PlayerControlZonesProps = {
  topGesture: PanGesture;
  bottomGesture: PanGesture;
};

function ControlZone({
  gesture,
  testID,
}: {
  gesture: PanGesture;
  testID: string;
}) {
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible={false}
        collapsable={false}
        pointerEvents="box-only"
        style={{ flex: 1 }}
        testID={testID}
      />
    </GestureDetector>
  );
}

export function PlayerControlZones({
  topGesture,
  bottomGesture,
}: PlayerControlZonesProps) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }}
    >
      <ControlZone gesture={topGesture} testID="top-player-control-zone" />
      <ControlZone
        gesture={bottomGesture}
        testID="bottom-player-control-zone"
      />
    </View>
  );
}
