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
    this.udpLedStrip = new UdpLedStrip(config['ipAddress'], log)
      .on('colorChange', (newColor) => {
        if (newColor.value() === 0) {
          this.isOn = false;
          this.ledStripService.updateCharacteristic(api.hap.Characteristic.On, false);
        } else {
          this.isOn = true;
          this.color = newColor;
          this.ledStripService.updateCharacteristic(api.hap.Characteristic.On, true);
          this.ledStripService.updateCharacteristic(api.hap.Characteristic.Hue, newColor.hue());
          this.ledStripService.updateCharacteristic(api.hap.Characteristic.Saturation, newColor.saturationv());
          this.ledStripService.updateCharacteristic(api.hap.Characteristic.Brightness, newColor.value());
        }
      });

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

  private updateColor(): void {
    this.udpLedStrip.color = this.isOn ? this.color : Color.rgb(0, 0, 0);
  }

  private handleOnGet(callback: CharacteristicGetCallback): void {
    try {
      callback(null, this.udpLedStrip.color.value() !== 0);
    } catch (err) {
      callback(err);
    }
  }

  private handleOnSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.isOn = value as boolean;

    try {
      this.updateColor();
      this.log.info(`Turned ${this.isOn ? 'on' : 'off'}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while turning lights ${this.isOn ? 'on' : 'off'}: ${err.message}`);
      callback(err);
    }
  }

  private handleHueGet(callback: CharacteristicGetCallback): void {
    try {
      callback(null, this.udpLedStrip.color.hue());
    } catch (err) {
      callback(err);
    }
  }

  private handleHueSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const hue = value as number;
    this.color = Color.hsv(hue, this.color.saturationv(), this.color.value());

    try {
      this.updateColor();
      this.log.info(`Color was set to ${this.color.hex()}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while setting hue: ${err.message}`);
      callback(err);
    }
  }

  private handleSaturationGet(callback: CharacteristicGetCallback): void {
    try {
      callback(null, this.udpLedStrip.color.saturationv());
    } catch (err) {
      callback(err);
    }
  }

  private handleSaturationSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const saturation = value as number;
    this.color = Color.hsv(this.color.hue(), saturation, this.color.value());

    try {
      this.updateColor();
      this.log.info(`Color was set to ${this.color.hex()}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while setting saturation: ${err.message}`);
      callback(err);
    }
  }

  private handleBrightnessGet(callback: CharacteristicGetCallback): void {
    try {
      callback(null, this.udpLedStrip.color.value());
    } catch (err) {
      callback(err);
    }
  }

  private handleBrightnessSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const brightness = value as number;
    this.color = Color.hsv(this.color.hue(), this.color.saturationv(), brightness);

    try {
      this.updateColor();
      this.log.info(`Color was set to ${this.color.hex()}.`);
      callback();
    } catch (err) {
      this.log.error(`Error while setting brightness: ${err.message}`);
      callback(err);
    }
  }
}
