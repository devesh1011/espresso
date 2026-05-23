#pragma once

#include <Arduino.h>
#include <vector>

using Bytes = std::vector<uint8_t>;

Bytes hexToVector(const String& hex);
Bytes uintToMinimalBytes(uint64_t value);
Bytes rlpBytes(const Bytes& value);
Bytes rlpString(const String& hex);
Bytes rlpUint(uint64_t value);
Bytes rlpList(const std::vector<Bytes>& items);
String vectorToHex(const Bytes& bytes);
