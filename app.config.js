/* eslint-disable */
module.exports = ({ config }) => {
  const turnUser =
    process.env.EXPO_PUBLIC_TURN_USERNAME || process.env.TURN_USERNAME || "";
  const turnCred =
    process.env.EXPO_PUBLIC_TURN_CREDENTIAL || process.env.TURN_CREDENTIAL || "";
  const signalingUrl =
    process.env.EXPO_PUBLIC_SIGNALING_URL || process.env.SIGNALING_URL || "";

  return {
    ...config,
    ios: {
      ...(config.ios || {}),
      infoPlist: {
        ...(config.ios?.infoPlist || {}),
        TURN_USERNAME: turnUser,
        TURN_CREDENTIAL: turnCred,
        SIGNALING_URL: signalingUrl,
      },
    },
  };
};
