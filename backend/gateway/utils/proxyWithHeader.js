import proxy from "express-http-proxy";

export const proxyWithHeader = (serviceUrl) => {
  return proxy(serviceUrl, {
    // Preserve multipart boundaries and binary PDF bytes while they pass through
    // the gateway; the agent service owns parsing of uploads and JSON bodies.
    parseReqBody: false,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userID;
      }
      return proxyReqOpts
    },
  });
};
