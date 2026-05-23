#pragma once

#include <Arduino.h>
#include <vector>

#include "rlp_encoder.h"

struct RadioFrame {
  uint32_t messageId;
  uint16_t index;
  uint16_t total;
  Bytes payload;
};

uint16_t crc16Ccitt(const uint8_t* data, size_t length);
std::vector<Bytes> chunkPayload(const Bytes& payload, uint32_t messageId, size_t mtu);
