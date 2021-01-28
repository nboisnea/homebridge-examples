import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  Logging,
  Service
} from 'homebridge';
import Color from 'color';
import UdpLedStrip from './utils/UdpLedStrip';

/*
 * Initializer function called when the plugin is ded.
 */
export = (api: API) => {
  api.registerAccessory('LedStrip', LedStrip);
};

class LedStrip implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private udpLedStrip: UdpLedStrip;
  private isOn = false;
  private color = Color.rgb(255, 255, 255);

  private readonly ledStripService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.udpLedStrip = new UdpLedStrip(config['ipAddress']);

    this.ledStripService = new api.hap.Service.Lightbulb(this.name);
    this.ledStripService.getCharacteristic(api.hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.handleOnGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleOnSet.bind(this));

    this.ledStripService.getCharacteristic(api.hap.Characteristic.Hue)
      .on(CharacteristicEventTypes.GET, this.handleHueGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleHueSet.bind(this));

    this.ledStripService.getCharacteristic(api.hap.Characteristic.Saturation)
      .on(CharacteristicEventTypes.GET, this.handleSaturationGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleSaturationSet.bind(this));

    this.ledStripService.getCharacteristic(api.hap.Characteristic.Brightness)
      .on(CharacteristicEventTypes.GET, this.handleBrightnessGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleBrightnessSet.bind(this));

    this.informationService = new api.hap.Service.AccessoryInformation()
      .setCharacteristic(api.hap.Characteristic.Manufacturer, 'Nathan Boisneault')
      .setCharacteristic(api.hap.Characteristic.Model, 'LED strip');

    log.info('LED Strip initialized');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  public getServices(): Service[] {
    return [
      this.informationService,
      this.ledStripService
    ];
  }

  private sendData(): Promise<void> {
    return this.udpLedStrip.sendColor(this.isOn ? this.color : Color.rgb(0, 0, 0));
  }

  private async handleOnGet(callback: CharacteristicGetCallback): Promise<void> {
    try {
      const currentColor = await this.udpLedStrip.fetchColor();
      callback(undefined, currentColor.value() !== 0);
    } catch (err) {
      callback(err);
    }
  }

  private async handleOnSet(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
    this.isOn = value as boolean;

    try {
      await this.sendData();
      this.log.info(`Turned ${this.isOn ? 'on' : 'off'}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while turning lights ${this.isOn ? 'on' : 'off'}: ${err.message}`);
      callback(err);
    }
  }

  private async handleHueGet(callback: CharacteristicGetCallback): Promise<void> {
    try {
      const currentColor = await this.udpLedStrip.fetchColor();
      callback(undefined, currentColor.hue());
    } catch (err) {
      callback(err);
    }
  }

  private async handleHueSet(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
    const hue = value as number;
    this.color = Color.hsv(hue, this.color.saturationv(), this.color.value());

    try {
      await this.sendData();
      this.log.info(`Color was set to ${this.color.hex()}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while setting hue: ${err.message}`);
      callback(err);
    }
  }

  private async handleSaturationGet(callback: CharacteristicGetCallback): Promise<void> {
    try {
      const currentColor = await this.udpLedStrip.fetchColor();
      callback(undefined, currentColor.saturationv());
    } catch (err) {
      callback(err);
    }
  }

  private async handleSaturationSet(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
    const saturation = value as number;
    this.color = Color.hsv(this.color.hue(), saturation, this.color.value());

    try {
      await this.sendData();
      this.log.info(`Color was set to ${this.color.hex()}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while setting saturation: ${err.message}`);
      callback(err);
    }
  }

  private async handleBrightnessGet(callback: CharacteristicGetCallback): Promise<void> {
    try {
      const currentColor = await this.udpLedStrip.fetchColor();
      callback(undefined, currentColor.value());
    } catch (err) {
      callback(err);
    }
  }

  private async handleBrightnessSet(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
    const brightness = value as number;
    this.color = Color.hsv(this.color.hue(), this.color.saturationv(), brightness);

    try {
      await this.sendData();
      this.log.info(`Color was set to ${this.color.hex()}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while setting brightness: ${err.message}`);
      callback(err);
    }
  }
}
