import Color from 'color';
import * as dgram from 'dgram';
import {Logging} from 'homebridge';

const PORT = 7026;
const TIMEOUT = 5000;

export default class UdpLedStrip {
  public readonly ipAddress: string;
  public readonly port = PORT;
  private log?: Logging;

  constructor(ipAddress: string, log?: Logging) {
    this.ipAddress = ipAddress;
    this.log = log;
  }

  public fetchColor(): Promise<Color> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4')
        .on('message', msg => {
          this.log?.debug(`Received UDP data: ${msg}`);
          resolve(Color.rgb(msg.readInt8(0), msg.readInt8(1), msg.readInt8(2)))
        })
        .on('error', err => reject(err))
        .on('listening', () => {
          setTimeout(() => {
            this.log?.debug('Request timed out');
            reject(new Error('Accessory did not respond'))
          }, TIMEOUT);
        });
      socket.send(Uint8Array.from([-1]), this.port, this.ipAddress, err => {
        if (err) {
          reject(err);
        }
        this.log?.debug(`Color request was sent`);
        socket.close();
      });
    });
  }

  public sendColor(color: Color): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      socket.send(Uint8Array.from([0, ...color.array()]), this.port, this.ipAddress, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
        socket.close();
      })
    })
  }
}
