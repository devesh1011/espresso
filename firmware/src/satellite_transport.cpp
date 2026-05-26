#include "satellite_transport.h"

#include "espresso_config.h"
#include "frame_codec.h"
#include "rlp_encoder.h"
#include "satellite_modem.h"

namespace {
IridiumSbdModem modem(Serial2);
bool ready = false;
}

bool beginSatellite() {
  modem.begin(ESPRESSO_MODEM_BAUD, ESPRESSO_MODEM_RX_PIN, ESPRESSO_MODEM_TX_PIN);
  ready = modem.probe();
  Serial.printf("satellite modem %s\n", ready ? "ready" : "not detected");
  return ready;
}

bool transmitRawTxSatellite(const String& rawTxHex) {
  if (!ready) return false;
  const Bytes payload = hexToVector(rawTxHex);
  const uint32_t messageId = esp_random();
  const std::vector<Bytes> frames = chunkPayload(payload, messageId, ESPRESSO_RADIO_MTU);
  for (const Bytes& frame : frames) {
    SatelliteSendResult result = modem.sendBinary(frame);
    if (result != SatelliteSendResult::Ok) {
      Serial.printf("satellite send failed: %d\n", static_cast<int>(result));
      return false;
    }
    delay(2000);
  }
  return true;
}

bool receiveSatelliteFrame(String& frameHex) {
  if (!ready) return false;
  Bytes frame;
  if (!modem.receiveBinary(frame)) return false;
  frameHex = "0x" + vectorToHex(frame);
  return true;
}
