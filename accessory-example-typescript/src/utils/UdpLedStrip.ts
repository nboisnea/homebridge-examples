import Color from 'color';
import * as dgram from 'dgram';
import { Socket } from 'dgram';
import { Logging } from 'homebridge';
import { AddressInfo } from 'net';
import { EventEmitter } from 'events';

const MULTICAST = '239.0.0.123';
const PORT = 7026;
const UPDATE_FREQUENCY = 5000;

export default class UdpLedStrip extends EventEmitter {
  public readonly ipAddress: string;
  public readonly port = PORT;

  private udpClient: Socket;
  private log?: Logging;
  private currentColor?: Color;
  private colorDate?: number;

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
          this.colorDate = Date.now();
          this.emit('colorChange', this.currentColor);
        }
      });
    this.udpClient.bind(PORT, () => {
      this.udpClient.setBroadcast(true);
      this.udpClient.setMulticastTTL(128);
      this.udpClient.addMembership(MULTICAST);
    });

    // Get current color and repeat every 5s
    this.fetchColor();
    setInterval(this.fetchColor.bind(this), UPDATE_FREQUENCY);
  }

  private fetchColor(): void {
    if (this.colorDate && Date.now() - this.colorDate > UPDATE_FREQUENCY) {
      this.log?.info('Resetting color since no response were received');
      this.currentColor = undefined;
    }
    this.udpClient.send(Uint8Array.from([-1]), this.port, this.ipAddress);
  }

  public on(event: 'colorChange', listener: (newColor: Color) => void): this {
    return super.on(event, listener);
  }

  public get color(): Color {
    if (this.currentColor) {
      return this.currentColor;
    } else {
      this.log?.error('Could not connect to LED strip');
      throw new Error('Could not connect to LED strip');
    }
  }

  public set color(color: Color) {
    this.udpClient.send(Uint8Array.from([0, ...color.rgb().array()]), this.port, this.ipAddress, err => {
      if (err) {
        throw err;
      }
    });
  }
}
