import careerDiscovery from "@/data/career-discovery.json"
import type { CareerDiscoveryResponse } from "@/lib/profiling/career-discovery-types"

export async function getCareerDiscovery(): Promise<CareerDiscoveryResponse> {
  return careerDiscovery as CareerDiscoveryResponse
}
