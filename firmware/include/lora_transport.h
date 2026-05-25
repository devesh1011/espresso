#pragma once

#include <Arduino.h>

bool beginLoRa();
bool transmitRawTxLoRa(const String& rawTxHex);
