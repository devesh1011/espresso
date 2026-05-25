#pragma once

#include <Arduino.h>
#include <vector>

#include "rlp_encoder.h"

enum class SatelliteSendResult {
  Ok,
  Timeout,
  ModemError,
  NetworkUnavailable,
};

class IridiumSbdModem {
 public:
  explicit IridiumSbdModem(HardwareSerial& serial);
  void begin(uint32_t baud, int rxPin, int txPin);
  bool probe();
  SatelliteSendResult sendBinary(const Bytes& payload);
  bool receiveBinary(Bytes& payload);

 private:
  HardwareSerial& serial_;
  bool sendCommand(const String& command, const String& expected, uint32_t timeoutMs);
  String readUntil(uint32_t timeoutMs);
  static uint16_t checksum(const Bytes& payload);
};
