export interface CreateLabelResult {
  tracking: string;
  labelUrl?: string;
  providerShipmentId?: string;
}
export interface ShippingProvider {
  createOutboundLabel(order: any): Promise<CreateLabelResult>;
  createReturnLabel(order: any): Promise<CreateLabelResult>;
}
