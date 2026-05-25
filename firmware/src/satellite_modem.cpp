#include "satellite_modem.h"

IridiumSbdModem::IridiumSbdModem(HardwareSerial& serial) : serial_(serial) {}

void IridiumSbdModem::begin(uint32_t baud, int rxPin, int txPin) {
  serial_.begin(baud, SERIAL_8N1, rxPin, txPin);
}

bool IridiumSbdModem::probe() {
  return sendCommand("AT", "OK", 2000) && sendCommand("AT&K0", "OK", 2000);
}

SatelliteSendResult IridiumSbdModem::sendBinary(const Bytes& payload) {
  if (payload.empty() || payload.size() > 340) return SatelliteSendResult::ModemError;
  if (!sendCommand("AT+SBDWB=" + String(payload.size()), "READY", 5000)) return SatelliteSendResult::Timeout;

  serial_.write(payload.data(), payload.size());
  const uint16_t sum = checksum(payload);
  serial_.write(static_cast<uint8_t>((sum >> 8) & 0xff));
  serial_.write(static_cast<uint8_t>(sum & 0xff));

  String loadResult = readUntil(10000);
  if (loadResult.indexOf("0") < 0 || loadResult.indexOf("OK") < 0) return SatelliteSendResult::ModemError;

  serial_.print("AT+SBDIX\r");
  String session = readUntil(70000);
  if (session.indexOf("+SBDIX:") < 0) return SatelliteSendResult::Timeout;
  int firstComma = session.indexOf(',');
  int status = session.substring(session.indexOf(':') + 1, firstComma).toInt();
  if (status == 0 || status == 1 || status == 2) return SatelliteSendResult::Ok;
  if (status == 32 || status == 33 || status == 34 || status == 35 || status == 36) {
    return SatelliteSendResult::NetworkUnavailable;
  }
  return SatelliteSendResult::ModemError;
}

bool IridiumSbdModem::receiveBinary(Bytes& payload) {
  serial_.print("AT+SBDIX\r");
  String session = readUntil(70000);
  if (session.indexOf("+SBDIX:") < 0) return false;

  int cursor = session.indexOf("+SBDIX:");
  for (int i = 0; i < 4; i++) cursor = session.indexOf(',', cursor + 1);
  int nextComma = session.indexOf(',', cursor + 1);
  int waiting = session.substring(cursor + 1, nextComma).toInt();
  if (waiting <= 0) return false;

  serial_.print("AT+SBDRB\r");
  uint32_t start = millis();
  while (serial_.available() < 2 && millis() - start < 5000) delay(5);
  if (serial_.available() < 2) return false;

  uint16_t length = static_cast<uint16_t>(serial_.read()) << 8;
  length |= static_cast<uint16_t>(serial_.read());
  if (length == 0 || length > 340) return false;

  payload.clear();
  payload.reserve(length);
  while (payload.size() < length && millis() - start < 10000) {
    if (serial_.available()) payload.push_back(static_cast<uint8_t>(serial_.read()));
  }
  if (payload.size() != length) return false;

  while (serial_.available() < 2 && millis() - start < 12000) delay(5);
  if (serial_.available() < 2) return false;
  uint16_t received = static_cast<uint16_t>(serial_.read()) << 8;
  received |= static_cast<uint16_t>(serial_.read());
  return received == checksum(payload);
}

bool IridiumSbdModem::sendCommand(const String& command, const String& expected, uint32_t timeoutMs) {
  serial_.print(command);
  serial_.print("\r");
  return readUntil(timeoutMs).indexOf(expected) >= 0;
}

String IridiumSbdModem::readUntil(uint32_t timeoutMs) {
  String out;
  const uint32_t start = millis();
  while (millis() - start < timeoutMs) {
    while (serial_.available()) out += static_cast<char>(serial_.read());
    if (out.indexOf("OK") >= 0 || out.indexOf("ERROR") >= 0 || out.indexOf("READY") >= 0) break;
    delay(10);
  }
  return out;
}

uint16_t IridiumSbdModem::checksum(const Bytes& payload) {
  uint16_t sum = 0;
  for (uint8_t byte : payload) sum += byte;
  return sum;
}
