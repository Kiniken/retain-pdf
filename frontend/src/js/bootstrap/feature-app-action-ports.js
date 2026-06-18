export function createAppActionPorts(features) {
  return {
    checkApiConnectivity: () => features.appActionsFeature?.checkApiConnectivity(),
  };
}
