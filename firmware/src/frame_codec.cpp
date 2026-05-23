#include "frame_codec.h"

uint16_t crc16Ccitt(const uint8_t* data, size_t length) {
  uint16_t crc = 0xffff;
  for (size_t i = 0; i < length; i++) {
    crc ^= static_cast<uint16_t>(data[i]) << 8;
    for (uint8_t bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return crc;
}

namespace {
void write16(Bytes& out, uint16_t value) {
  out.push_back((value >> 8) & 0xff);
  out.push_back(value & 0xff);
}

void write32(Bytes& out, uint32_t value) {
  out.push_back((value >> 24) & 0xff);
  out.push_back((value >> 16) & 0xff);
  out.push_back((value >> 8) & 0xff);
  out.push_back(value & 0xff);
}

Bytes encodeFrame(const RadioFrame& frame) {
  Bytes out;
  out.reserve(14 + frame.payload.size());
  out.push_back(0xe5);
  out.push_back(1);
  write32(out, frame.messageId);
  write16(out, frame.index);
  write16(out, frame.total);
  write16(out, frame.payload.size());
  write16(out, 0);
  out.insert(out.end(), frame.payload.begin(), frame.payload.end());
  const uint16_t crc = crc16Ccitt(out.data(), out.size());
  out[12] = (crc >> 8) & 0xff;
  out[13] = crc & 0xff;
  return out;
}
}  // namespace

std::vector<Bytes> chunkPayload(const Bytes& payload, uint32_t messageId, size_t mtu) {
  const size_t maxPayload = mtu - 14;
  const uint16_t total = static_cast<uint16_t>((payload.size() + maxPayload - 1) / maxPayload);
  std::vector<Bytes> frames;
  frames.reserve(total);
  for (uint16_t i = 0; i < total; i++) {
    const size_t start = i * maxPayload;
    const size_t end = min(payload.size(), start + maxPayload);
    frames.push_back(encodeFrame({
        .messageId = messageId,
        .index = i,
        .total = total,
        .payload = Bytes(payload.begin() + start, payload.begin() + end),
    }));
  }
  return frames;
}
