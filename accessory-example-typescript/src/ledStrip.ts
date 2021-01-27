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
} from "homebridge";
import * as dgram from "dgram";
import {Socket} from "dgram";
import Color from "color";

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  api.registerAccessory("LedStrip", LedStrip);
};

class LedStrip implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly ipAddress: string;
  private readonly port: number;

  private isOn = false;
  private color = Color.rgb(255, 255, 255);

  private udpClient: Socket;

  private readonly ledStripService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.ipAddress = config['ipAddress'];
    this.port = config['port'];
    this.udpClient = dgram.createSocket('udp4');

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
      .setCharacteristic(api.hap.Characteristic.Manufacturer, "Nathan Boisneault")
      .setCharacteristic(api.hap.Characteristic.Model, "LED strip");

    log.info("LED Strip initialized");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  public getServices(): Service[] {
    return [
      this.informationService,
      this.ledStripService,
    ];
  }

  private sendData(callback: CharacteristicSetCallback): void {
    const message = Uint8Array.from(this.isOn ? this.color.rgb().array() : [0, 0, 0]);
    this.udpClient.send(message, this.port, this.ipAddress, err => {
      this.log(`LEDs set to ${this.color.hex()} / ${this.color.hsv().string()}.`);
      callback(err);
    })
  }

  private handleOnGet(callback: CharacteristicGetCallback): void {
    callback(undefined, this.isOn);
  }

  private handleOnSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.isOn = value as boolean;
    this.sendData(callback);
  }

  private handleHueGet(callback: CharacteristicGetCallback): void {
    callback(undefined, this.color.hue());
  }

  private handleHueSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const hue = value as number;
    this.color = Color.hsv(hue, this.color.saturationl(), this.color.value());
    this.sendData(callback);
  }

  private handleSaturationGet(callback: CharacteristicGetCallback): void {
    callback(undefined, this.color.saturationv());
  }

  private handleSaturationSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const saturation = value as number;
    this.color = Color.hsv(this.color.hue(), saturation, this.color.value());
    this.sendData(callback);
  }

  private handleBrightnessGet(callback: CharacteristicGetCallback): void {
    callback(undefined, this.color.value());
  }

  private handleBrightnessSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const brightness = value as number;
    this.color = Color.hsv(this.color.hue(), this.color.saturationv(), brightness);
    this.sendData(callback);
  }
}
