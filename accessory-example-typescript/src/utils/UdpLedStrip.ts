import Color from 'color';
import * as dgram from 'dgram';
import { Socket } from 'dgram';
import { Logging } from 'homebridge';
import { AddressInfo } from 'net';
import { EventEmitter } from 'events';
import Timeout = NodeJS.Timeout;

const MULTICAST_ADDR = '239.0.0.123';
const PORT = 7026;
const UPDATE_FREQUENCY = 5000;

export default class UdpLedStrip extends EventEmitter {
  public readonly ipAddress: string;
  public readonly port = PORT;

  private udpClient: Socket;
  private log?: Logging;
  private currentColor?: Color;
  private colorTimeout?: Timeout;

  constructor(ipAddress: string, log: Logging) {
    super();

    this.ipAddress = ipAddress;
    this.log = log;

    this.udpClient = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      .on('listening', () => {
        const info = this.udpClient.address() as AddressInfo;
        this.log?.info(`Plugin listening to ${info.address}:${info.port}`);
      })
      .on('message', (msg, rinfo) => {
        if (rinfo.address === this.ipAddress) {
          this.log?.info(`Received RGB value: ${msg.readUInt8(0)} ${msg.readUInt8(1)} ${msg.readUInt8(2)}`);
          this.currentColor = Color.rgb(msg.readUInt8(0), msg.readUInt8(1), msg.readUInt8(2));
          this.emit('newColor', this.currentColor);

          if (this.colorTimeout) {
            clearTimeout(this.colorTimeout);
          }
          this.colorTimeout = setTimeout(() => {
            // Reset color if no new value has been received after twice the strip's update rate
            this.currentColor = undefined;
          }, 2 * UPDATE_FREQUENCY);
        }
      });
    this.udpClient.bind(PORT, () => {
      this.udpClient.setBroadcast(true);
      this.udpClient.setMulticastTTL(128);
      this.udpClient.addMembership(MULTICAST_ADDR);
    });
  }

  public on(event: 'newColor', listener: (newColor: Color) => void): this {
    return super.on(event, listener);
  }

  public get color(): Color {
    if (this.currentColor) {
      return this.currentColor;
    } else {
      throw new Error('Could not connect to LED strip');
    }
  }

  public set color(color: Color) {
    this.udpClient.send(Uint8Array.from([0, ...color.rgb().round().array()]), this.port, this.ipAddress, err => {
      if (err) {
        throw err;
      }
    });
  }
}
