#include "rlp_encoder.h"

#include "crypto_signer.h"

namespace {
void appendLength(Bytes& out, uint8_t offset, size_t length) {
  if (length < 56) {
    out.push_back(offset + length);
    return;
  }
  Bytes lengthBytes = uintToMinimalBytes(length);
  out.push_back(offset + 55 + lengthBytes.size());
  out.insert(out.end(), lengthBytes.begin(), lengthBytes.end());
}
}  // namespace

Bytes hexToVector(const String& hex) {
  String clean = hex;
  if (clean.startsWith("0x")) clean = clean.substring(2);
  Bytes out(clean.length() / 2);
  hexToBytes(clean, out.data(), out.size());
  return out;
}

Bytes uintToMinimalBytes(uint64_t value) {
  if (value == 0) return {};
  Bytes out;
  bool started = false;
  for (int shift = 56; shift >= 0; shift -= 8) {
    uint8_t byte = static_cast<uint8_t>((value >> shift) & 0xff);
    if (byte != 0 || started) {
      out.push_back(byte);
      started = true;
    }
  }
  return out;
}

Bytes rlpBytes(const Bytes& value) {
  if (value.size() == 1 && value[0] < 0x80) return value;
  Bytes out;
  appendLength(out, 0x80, value.size());
  out.insert(out.end(), value.begin(), value.end());
  return out;
}

Bytes rlpString(const String& hex) {
  return rlpBytes(hexToVector(hex));
}

Bytes rlpUint(uint64_t value) {
  return rlpBytes(uintToMinimalBytes(value));
}

Bytes rlpList(const std::vector<Bytes>& items) {
  Bytes payload;
  for (const Bytes& item : items) payload.insert(payload.end(), item.begin(), item.end());
  Bytes out;
  appendLength(out, 0xc0, payload.size());
  out.insert(out.end(), payload.begin(), payload.end());
  return out;
}

String vectorToHex(const Bytes& bytes) {
  return bytesToHexString(bytes.data(), bytes.size());
}
