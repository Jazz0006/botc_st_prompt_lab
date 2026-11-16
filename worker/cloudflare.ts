// Entry for the self-hosted Cloudflare deployment (scripts/deploy-cloudflare.mjs).
import worker from "./index";
import { withCloudflareAccess } from "./cloudflare-access";

export default withCloudflareAccess(worker);
