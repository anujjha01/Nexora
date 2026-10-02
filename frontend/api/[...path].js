export default function handler(_request, response) {
  return response.status(503).json({
    error: "Nexora's backend is not configured for this deployment yet.",
    help: "Deploy the backend with reachable MongoDB and Redis services, then connect the API route.",
  });
}
