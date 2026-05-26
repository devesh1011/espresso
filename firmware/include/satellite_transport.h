#pragma once

#include <Arduino.h>

bool beginSatellite();
bool transmitRawTxSatellite(const String& rawTxHex);
bool receiveSatelliteFrame(String& frameHex);
