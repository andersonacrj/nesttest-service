import EasyPost from '@easypost/api';
import { cfg } from '../config/config';

const client = new EasyPost(cfg().easypostApiKey);

export class EasyPostProvider {
  async createOutboundLabel(order: any) {
    const c = cfg();
    const shipment = await client.Shipment.create({
      to_address: this.parseAddress(order.patientName, order.patientAddress),
      from_address: c.fromAddress,
      parcel: { weight: c.defaultWeightOz },
    });
    const rate =
      shipment.rates.find((r: any) => r.carrier === 'USPS') ??
      shipment.lowestRate(['USPS']);
    const bought = await client.Shipment.buy(shipment.id, rate.id);
    return {
      tracking: bought.tracking_code,
      labelUrl: bought.postage_label?.label_url,
      providerShipmentId: bought.id,
    };
  }

  async createReturnLabel(order: any) {
    const c = cfg();
    const shipment = await client.Shipment.create({
      to_address: c.labAddress,
      from_address: this.parseAddress(order.patientName, order.patientAddress),
      parcel: { weight: c.defaultWeightOz },
      is_return: true,
    });
    const rate =
      shipment.rates.find((r: any) => r.carrier === 'USPS') ??
      shipment.lowestRate(['USPS']);
    const bought = await client.Shipment.buy(shipment.id, rate.id);
    return {
      tracking: bought.tracking_code,
      labelUrl: bought.postage_label?.label_url,
      providerShipmentId: bought.id,
    };
  }

  private parseAddress(name: string, full: string) {
    const [street1, city, state, zip] = (full ?? '')
      .split(',')
      .map((s: string) => s.trim());
    return { name, street1, city, state, zip };
  }
}
