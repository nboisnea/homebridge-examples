import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import * as dgram from "dgram";
import {Socket} from "dgram";
import Color from "color";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("LedStrip", LedStrip);
};

class LedStrip implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private ipAddress = '192.168.1.55';
  private port = 7026;

  private isOn = false;
  private color = Color.rgb(255, 255, 255);

  private udpClient: Socket;

  private readonly ledStripService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.udpClient = dgram.createSocket('udp4');

    this.ledStripService = new hap.Service.Lightbulb(this.name);
    this.ledStripService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.handleOnGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleOnSet.bind(this));

    this.ledStripService.getCharacteristic(hap.Characteristic.Hue)
      .on(CharacteristicEventTypes.GET, this.handleHueGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleHueSet.bind(this));

    this.ledStripService.getCharacteristic(hap.Characteristic.Saturation)
      .on(CharacteristicEventTypes.GET, this.handleSaturationGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleSaturationSet.bind(this));

    this.ledStripService.getCharacteristic(hap.Characteristic.Brightness)
      .on(CharacteristicEventTypes.GET, this.handleBrightnessGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleBrightnessSet.bind(this));

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Nathan Boisneault")
      .setCharacteristic(hap.Characteristic.Model, "LED strip");

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
      this.log(`LEDs set to ${this.color.hex()} / ${this.color.hsl().string()}.`);
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
    this.color = Color.hsl(hue, this.color.saturationl(), this.color.lightness());
    this.sendData(callback);
  }

  private handleSaturationGet(callback: CharacteristicGetCallback): void {
    callback(undefined, this.color.saturationl());
  }

  private handleSaturationSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const saturation = value as number;
    this.color = Color.hsl(this.color.hue(), saturation, this.color.lightness());
    this.sendData(callback);
  }


  private handleBrightnessGet(callback: CharacteristicGetCallback): void {
    callback(undefined, this.color.lightness());
  }

  private handleBrightnessSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const brightness = value as number;
    this.color = Color.hsl(this.color.hue(), this.color.saturationl(), brightness);
    this.sendData(callback);
  }
}
