#include "lora_transport.h"

#include <RadioLib.h>

#include "espresso_config.h"
#include "frame_codec.h"
#include "rlp_encoder.h"

namespace {
SX1276 radio = new Module(18, 26, 14, 35);
bool ready = false;
}  // namespace

bool beginLoRa() {
  int state = radio.begin(915.0);
  ready = state == RADIOLIB_ERR_NONE;
  if (!ready) {
    Serial.printf("LoRa init failed: %d\n", state);
  }
  return ready;
}

bool transmitRawTxLoRa(const String& rawTxHex) {
  if (!ready) return false;
  const Bytes payload = hexToVector(rawTxHex);
  const uint32_t messageId = esp_random();
  const std::vector<Bytes> frames = chunkPayload(payload, messageId, ESPRESSO_RADIO_MTU);
  for (const Bytes& frame : frames) {
    int state = radio.transmit(frame.data(), frame.size());
    if (state != RADIOLIB_ERR_NONE) {
      Serial.printf("LoRa transmit failed: %d\n", state);
      return false;
    }
    delay(100);
  }
  return true;
}
