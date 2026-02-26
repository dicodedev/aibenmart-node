import {
  RtpCodecCapability,
  TransportListenIp,
  WorkerLogTag,
} from "mediasoup/node/lib/types";
import os from "os";
import dotenv from "dotenv";
dotenv.config();

export const config = {
  listenIp: "0.0.0.0",
  listenPort: 3016,

  mediasoup: {
    numWorkers: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: "debug",
      logTags: ["info", "ice", "dtls", "srtp", "rtcp"] as WorkerLogTag[],
    },
    router: {
      mediaCodes: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
          parameters: {
            "x-google-start-bitrate": 1000,
          },
        },
      ] as RtpCodecCapability[],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: process.env.PUBLIC_IP, //127.0.0.1 or 18.134.227.29 //replace by public ip address
        },
      ] as TransportListenIp[],
      maxIncomeBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
} as const;
