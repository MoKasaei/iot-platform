#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Ticker.h>
#include <EEPROM.h>

/***********************************************************
 *  ⚙️ Configuration Variables
 **********************************************************/
#define EEPROM_SIZE 512
#define CITY_EEPROM_SIZE 50
#define CITY_START_ADDR 0
const String START_MARKER = "<ALIREZA_1050_START>";
const String END_MARKER   = "<MALEKI_1050_END>";
char ssid[50]         = "";
char password[50]     = "";
char deviceID[50]     = "";
char mqttBroker[100]  = "89.251.9.24";
char serverURL[100]   = "";
int mqttPort          = 1883;
const char* MQTT_USERNAME = "mqtt";
const char* MQTT_PASSWORD = "mqtt";

String mqttTopic        = "iotdashboard/devices/ali1050/telemetry";
String mqttCommandTopic = "iotdashboard/devices/ali1050/commands";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool isConfigured = false;
String serialBuffer = "";

Ticker wifiPromptTicker;
Ticker weatherTicker;

bool mqttConnectedBefore = false;

String lastValues16[16];
bool hasPreviousData16 = false;

String lastValues17[17];
bool hasPreviousData17 = false;

bool blockSerialSend = false;
unsigned long lastCommandTime = 0;
const unsigned long blockDuration = 2000;

// ✅ WiFi/MQTT Status Tracking
enum WiFiStatusEnum { WIFI_NOT_CONFIGURED, WIFI_CONNECTING, WIFI_OK, WIFI_ERROR };
enum MQTTStatusEnum { MQTT_NOT_CONFIGURED, MQTT_CONNECTING, MQTT_OK, MQTT_ERROR };

WiFiStatusEnum currentWiFiStatus = WIFI_NOT_CONFIGURED;
MQTTStatusEnum currentMQTTStatus = MQTT_NOT_CONFIGURED;

unsigned long lastStatusReportTime = 0;
const unsigned long statusReportInterval = 2000; // 2 seconds

// ✅ WiFi monitoring interval
unsigned long lastWiFiCheckTime = 0;
const unsigned long wifiCheckInterval = 1000; // Check every 1 second

// ✅ WiFi reconnection control
unsigned long lastWiFiReconnectAttempt = 0;
const unsigned long wifiReconnectInterval = 10000; // Try reconnect every 10 seconds

/***********************************************************
 *  🔑 JSON Keys
 **********************************************************/
const char* keys17[17] = {
  "TempSet", "WinSum", "Eco", "Spk", "AutoManual", "Fan1", "Fan2", "Night", "PumpONOFF",
  "NormalTroque", "DischargeTime", "CoilTemp", "StageStatus", "TimerONOFF", "TimerSet", "SystemONOFF", "TurboONOFF"
};

const char* keys16[16] = {
  "RoomTemp", "Humidity", "MotorSpeed", "Watt", "Current", "LevelSwitch", "CircularPump", "DrainPump",
  "DriveTemp", "RadiatorTemp", "FanIntakeTemp", "WaterTankTemp", "TowerInletTemp", "TowerOutletTemp", "TDS", "Errors"
};

/***********************************************************
 *  🌦 Weather API Configuration
 **********************************************************/
String apiKey = "637e3bab23514969dff33c011c26e143";
String city = "";
String country = "";
bool shouldUpdateWeather = true;

/***********************************************************
 *  💾 EEPROM Management
 **********************************************************/

String loadCityFromEEPROM() {
  EEPROM.begin(EEPROM_SIZE);

  String loadedCity = "";
  char ch;

  for (int i = 0; i < (CITY_EEPROM_SIZE - 1); i++) {
    ch = EEPROM.read(CITY_START_ADDR + i);

    if (ch == '\0' || ch == 0xFF) break;

    if (ch >= 32 && ch <= 126) {
      loadedCity += ch;
    } else {
      break;
    }
  }

  EEPROM.end();
  loadedCity.trim();

  if (loadedCity.length() > 0) {
    Serial.print("[EEPROM] City loaded: ");
    Serial.println(loadedCity);
    return loadedCity;
  } else {
    Serial.println("[EEPROM] No valid city found");
    return "";
  }
}

void saveCityToEEPROM(String cityName) {
  cityName.trim();

  if (cityName.length() == 0 || cityName == "null") {
    Serial.println("[EEPROM] ⚠️ Invalid city name → skipping save");
    return;
  }

  if (cityName == city) {
    Serial.print("[EEPROM] 📭 City unchanged (");
    Serial.print(cityName);
    Serial.println(") → Skip write to preserve EEPROM lifespan");
    return;
  }

  Serial.print("[EEPROM] 🔄 City changed from '");
  Serial.print(city);
  Serial.print("' to '");
  Serial.print(cityName);
  Serial.println("' → Writing to EEPROM...");

  EEPROM.begin(EEPROM_SIZE);

  for (int i = 0; i < CITY_EEPROM_SIZE; i++) {
    EEPROM.write(CITY_START_ADDR + i, 0);
  }

  int len = cityName.length();
  if (len >= CITY_EEPROM_SIZE) {
    len = CITY_EEPROM_SIZE - 1;
  }

  for (int i = 0; i < len; i++) {
    EEPROM.write(CITY_START_ADDR + i, cityName[i]);
  }

  EEPROM.write(CITY_START_ADDR + len, '\0');

  if (EEPROM.commit()) {
    Serial.print("[EEPROM] ✅ City saved successfully: ");
    Serial.println(cityName);
  } else {
    Serial.println("[EEPROM] ❌ Commit failed!");
  }

  EEPROM.end();
}

/***********************************************************
 *  📡 Forward Declarations
 **********************************************************/
void sendWiFiStatus();
void sendMQTTStatus();
void connectToWiFi();
void connectToMQTT();

/***********************************************************
 *  📡 Status Reporting to Display (Serial)
 **********************************************************/

/**
 * Send WiFi status message to display
 */
void sendWiFiStatus() {
  switch (currentWiFiStatus) {
    case WIFI_OK:
      Serial.println("$WIFIOK#");
      break;
    case WIFI_CONNECTING:
      Serial.println("$WIFICON#");
      break;
    case WIFI_ERROR:
      Serial.println("$WIFIERR#");
      break;
    default:
      // WIFI_NOT_CONFIGURED - don't send anything
      break;
  }
}

/**
 * Send MQTT status message to display
 */
void sendMQTTStatus() {
  switch (currentMQTTStatus) {
    case MQTT_OK:
      Serial.println("$MQTTOK#");
      break;
    case MQTT_CONNECTING:
      Serial.println("$MQTTCON#");
      break;
    case MQTT_ERROR:
      Serial.println("$MQTTERR#");
      break;
    default:
      // MQTT_NOT_CONFIGURED - don't send anything
      break;
  }
}

/**
 * ✅ Update WiFi status and send immediately if changed
 */
void updateWiFiStatus(WiFiStatusEnum newStatus) {
  if (currentWiFiStatus != newStatus) {
    currentWiFiStatus = newStatus;
    sendWiFiStatus();
    lastStatusReportTime = millis(); // Reset timer
  }
}

/**
 * ✅ Update MQTT status and send immediately if changed
 */
void updateMQTTStatus(MQTTStatusEnum newStatus) {
  if (currentMQTTStatus != newStatus) {
    currentMQTTStatus = newStatus;
    sendMQTTStatus();
    lastStatusReportTime = millis(); // Reset timer
  }
}

/**
 * ✅ Send MQTT OK only (for successful publish without changing state)
 */
void sendMQTTOK() {
  Serial.println("$MQTTOK#");
}

/**
 * ✅ Process status reporting - periodic reminders
 */
void handleStatusReporting() {
  unsigned long now = millis();

  if (now - lastStatusReportTime >= statusReportInterval) {
    lastStatusReportTime = now;

    // Send WiFi status if connecting or error (periodic reminder)
    if (currentWiFiStatus == WIFI_CONNECTING || currentWiFiStatus == WIFI_ERROR) {
      sendWiFiStatus();
    }

    // Send MQTT status if connecting or error (periodic reminder)
    if (currentMQTTStatus == MQTT_CONNECTING || currentMQTTStatus == MQTT_ERROR) {
      sendMQTTStatus();
    }
  }
}

/**
 * ✅ Continuous WiFi and MQTT connection monitoring
 */
void monitorWiFiConnection() {
  unsigned long now = millis();

  if (now - lastWiFiCheckTime < wifiCheckInterval) {
    return; // Not time to check yet
  }

  lastWiFiCheckTime = now;

  if (!isConfigured) {
    return; // Not configured yet
  }

  // ===== WiFi Status Check =====
  if (WiFi.status() != WL_CONNECTED) {
    // WiFi is disconnected
    if (currentWiFiStatus == WIFI_OK) {
      Serial.println("⚠️ WiFi connection lost!");
      updateWiFiStatus(WIFI_ERROR);

      // WiFi lost → MQTT is also lost
      if (currentMQTTStatus != MQTT_ERROR && currentMQTTStatus != MQTT_NOT_CONFIGURED) {
        Serial.println("⚠️ MQTT disconnected due to WiFi loss!");
        updateMQTTStatus(MQTT_ERROR);
      }
    }

    // Try to reconnect WiFi (with interval limit to avoid blocking)
    if (currentWiFiStatus == WIFI_ERROR) {
      if (now - lastWiFiReconnectAttempt >= wifiReconnectInterval) {
        lastWiFiReconnectAttempt = now;
        Serial.println("🔄 Attempting WiFi reconnection...");
        connectToWiFi();
      }
    }
  }
  else {
    // WiFi is connected
    if (currentWiFiStatus != WIFI_OK) {
      Serial.println("✅ WiFi connection restored!");
      updateWiFiStatus(WIFI_OK);
    }

    // ===== MQTT Status Check (only if WiFi is OK) =====
    if (!mqttClient.connected()) {
      // MQTT is disconnected
      if (currentMQTTStatus == MQTT_OK) {
        Serial.println("⚠️ MQTT connection lost!");
        updateMQTTStatus(MQTT_ERROR);
      }

      // Try to reconnect MQTT
      if (currentMQTTStatus == MQTT_ERROR || currentMQTTStatus == MQTT_NOT_CONFIGURED) {
        connectToMQTT();
      }
    }
    else {
      // MQTT is connected
      if (currentMQTTStatus != MQTT_OK) {
        // This handles the case where MQTT reconnects successfully
        updateMQTTStatus(MQTT_OK);
      }
    }
  }
}

/***********************************************************
 *  📡 WiFi and MQTT Connection
 **********************************************************/
void connectToWiFi() {
  updateWiFiStatus(WIFI_CONNECTING);

  Serial.print("📶 Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts++ < 20) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected.");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    updateWiFiStatus(WIFI_OK);
  } else {
    Serial.println("\n❌ WiFi connection failed.");
    updateWiFiStatus(WIFI_ERROR);
  }
}

unsigned long lastMqttAttempt = 0;
const unsigned long mqttRetryInterval = 5000;

void connectToMQTT() {
  // Don't try to connect if WiFi is not connected
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMQTTStatus != MQTT_ERROR) {
      Serial.println("⚠️ Cannot connect to MQTT: WiFi not connected");
      updateMQTTStatus(MQTT_ERROR);
    }
    return;
  }

  if (millis() - lastMqttAttempt < mqttRetryInterval) {
    return; // Too soon to retry
  }

  lastMqttAttempt = millis();

  if (currentMQTTStatus != MQTT_CONNECTING) {
    updateMQTTStatus(MQTT_CONNECTING);
  }

  mqttClient.setServer(mqttBroker, mqttPort);
  mqttClient.setCallback(mqttCallback);

  if (mqttClient.connect(deviceID, MQTT_USERNAME, MQTT_PASSWORD)) {
    if (!mqttConnectedBefore) {
      Serial.println("✅ MQTT connected.");
      Serial.print("📡 Subscribed to topic: ");
      Serial.println(mqttCommandTopic);
    }
    mqttClient.subscribe(mqttCommandTopic.c_str());
    mqttConnectedBefore = true;

    updateMQTTStatus(MQTT_OK);
  } else {
    Serial.print("❌ MQTT connection error: ");
    Serial.println(mqttClient.state());
    updateMQTTStatus(MQTT_ERROR);
  }
}

void configureTime() {
  configTime(3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void updateWeatherFlag() {
  shouldUpdateWeather = true;
}

/***********************************************************
 *  📨 MQTT Command Reception
 **********************************************************/
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  if (String(topic) == mqttCommandTopic) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (error) {
      Serial.println("⚠️ Invalid JSON.");
      return;
    }

    // ✅ Location command handling
    if (doc.containsKey("Location")) {
      String newCity = doc["Location"].as<String>();
      newCity.trim();

      if (newCity.length() > 0 && newCity != "null") {
        saveCityToEEPROM(newCity);

        String oldCity = city;
        city = newCity;

        if (oldCity != city) {
          Serial.print("🌦 City updated: ");
          Serial.print(oldCity);
          Serial.print(" → ");
          Serial.println(city);
          shouldUpdateWeather = true;
        }
      }
      return;
    }

    // ✅ SetData command handling
    StaticJsonDocument<512> immediateDoc;
    bool shouldSend = false;

    for (int i = 0; i < 17; i++) {
      if (doc.containsKey(keys17[i])) {
        String value = doc[keys17[i]].as<String>();
        Serial.print("$SetData,");
        Serial.print(i + 1);
        Serial.print(",");
        Serial.print(value);
        Serial.println("#");

        immediateDoc[keys17[i]] = value;
        shouldSend = true;
      }
    }

    if (shouldSend) {
      String jsonOut;
      serializeJson(immediateDoc, jsonOut);

      if (mqttClient.publish(mqttTopic.c_str(), jsonOut.c_str())) {
        Serial.print("📤 Sent SetData to server: ");
        Serial.println(jsonOut);
        // ✅ Send MQTTOK without changing state
        sendMQTTOK();
      } else {
        Serial.println("❌ Failed to publish SetData");
        updateMQTTStatus(MQTT_ERROR);
      }

      blockSerialSend = true;
      lastCommandTime = millis();
    }
  }
}

/***********************************************************
 *  ⚙️ Serial WiFi/MQTT Configuration Processing
 **********************************************************/
void processSerialConfig(String input) {

  input.trim();

  // اکنون رشته به صورت مستقیم دریافت می‌شود:
  // SSID,PASSWORD,DEVICEID,BROKER[,SERVERURL]

  String parts[6];
  int index = 0;

  while (input.length() > 0 && index < 6) {

    int commaIndex = input.indexOf(',');

    if (commaIndex == -1) {
      parts[index++] = input;
      break;
    }
    else {
      parts[index++] = input.substring(0, commaIndex);
      input = input.substring(commaIndex + 1);
    }
  }

  if (index < 4 || index > 5) {
    Serial.println("⚠️ Parameter count must be 4 or 5 (SSID,PASS,ID,BROKER[,SERVERURL])");
    return;
  }

  parts[0].toCharArray(ssid, sizeof(ssid));
  parts[1].toCharArray(password, sizeof(password));
  parts[2].toCharArray(deviceID, sizeof(deviceID));
  // Keep receiving the broker field over UART for protocol compatibility,
  // but always use the fixed production broker requested for this firmware.
  strncpy(mqttBroker, "89.251.9.24", sizeof(mqttBroker) - 1);
  mqttBroker[sizeof(mqttBroker) - 1] = '\0';

  if (index == 5) {
    parts[4].toCharArray(serverURL, sizeof(serverURL));
  }
  else {
    serverURL[0] = '\0';
  }

  mqttTopic        = "iotdashboard/devices/" + String(deviceID) + "/telemetry";
  mqttCommandTopic = "iotdashboard/devices/" + String(deviceID) + "/commands";

  Serial.println("==================================");
  Serial.println("✅ New configuration received");
  Serial.print("SSID   : ");
  Serial.println(ssid);
  Serial.print("PASS   : ");
  Serial.println(password);
  Serial.print("ID     : ");
  Serial.println(deviceID);
  Serial.print("BROKER : ");
  Serial.println(mqttBroker);

  if (serverURL[0] != '\0') {
    Serial.print("SERVER : ");
    Serial.println(serverURL);
  }
  else {
    Serial.println("SERVER : (not set)");
  }

  Serial.print("TOPIC  : ");
  Serial.println(mqttTopic);
  Serial.println("==================================");

  connectToWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    configureTime();
    connectToMQTT();
    isConfigured = true;
    wifiPromptTicker.detach();
  }
}

/***********************************************************
 *  📤 Serial Data Sending
 **********************************************************/
void processSerialPayload(String input) {
  input.trim();

  if (blockSerialSend) {
    if (millis() - lastCommandTime < blockDuration) {
      Serial.println("⏸️ Serial publish temporarily blocked after SetData.");
      return;
    } else {
      blockSerialSend = false;
      Serial.println("▶️ Serial publish re-enabled.");
    }
  }

  if (!(input.startsWith("$") && (input.endsWith("*") || input.endsWith("&")))) {
    return;
  }

  bool is17 = input.endsWith("*");
  bool is16 = input.endsWith("&");

  input = input.substring(1, input.length() - 1);

  String parts[50];
  int index = 0;
  while (input.length() > 0 && index < 50) {
    int commaIndex = input.indexOf(',');
    if (commaIndex == -1) {
      parts[index++] = input;
      break;
    }
    parts[index++] = input.substring(0, commaIndex);
    input = input.substring(commaIndex + 1);
  }

  if (is17) {
    bool changed = false;
    StaticJsonDocument<512> telemetryDoc;

    for (int i = 0; i < 17; i++) {
      String newVal = (i < index && parts[i].length() > 0) ? parts[i] : "0";
      if (!hasPreviousData17 || newVal != lastValues17[i]) {
        changed = true;
        lastValues17[i] = newVal;
        telemetryDoc["statuse" + String(i + 1)] = newVal;
      }
    }

    hasPreviousData17 = true;

    if (!changed) {
      Serial.println("📭 No change detected (17 params) → skip MQTT publish.");
      return;
    }

    String telemetryJson;
    serializeJson(telemetryDoc, telemetryJson);

    if (mqttClient.publish(mqttTopic.c_str(), telemetryJson.c_str())) {
      Serial.print("📤 Telemetry partial sent (17): ");
      Serial.println(telemetryJson);
      // ✅ Send MQTTOK without changing state
      sendMQTTOK();
    } else {
      Serial.println("❌ Failed to publish telemetry (17 params)");
      updateMQTTStatus(MQTT_ERROR);
    }
  }
  else if (is16) {
    bool changed = false;
    StaticJsonDocument<512> changedDoc;

    for (int i = 0; i < 16; i++) {
      String newVal = (i < index && parts[i].length() > 0) ? parts[i] : "0";
      if (!hasPreviousData16 || newVal != lastValues16[i]) {
        changed = true;
        lastValues16[i] = newVal;
        changedDoc[keys16[i]] = newVal;
      }
    }

    hasPreviousData16 = true;

    if (!changed) {
      Serial.println("📭 No change detected (16 params) → skip MQTT publish.");
      return;
    }

    String changedJson;
    serializeJson(changedDoc, changedJson);

    if (mqttClient.publish(mqttTopic.c_str(), changedJson.c_str())) {
      Serial.print("📤 Changed params sent (16): ");
      Serial.println(changedJson);
      // ✅ Send MQTTOK without changing state
      sendMQTTOK();
    } else {
      Serial.println("❌ Failed to publish telemetry (16 params)");
      updateMQTTStatus(MQTT_ERROR);
    }
  }
}

/***********************************************************
 *  ⏱ Serial Input Reading
 **********************************************************/
void checkSerialInput() {

  while (Serial.available()) {

    char c = Serial.read();
    serialBuffer += c;

    // جلوگیری از بزرگ شدن بیش از حد بافر
    if (serialBuffer.length() > 600) {
      serialBuffer = "";
    }

    int startIndex = serialBuffer.indexOf(START_MARKER);
    int endIndex   = serialBuffer.indexOf(END_MARKER);

    if (startIndex != -1 && endIndex != -1 && endIndex > startIndex) {

      // فقط متن بین START و END استخراج می‌شود
      String msg = serialBuffer.substring(
                     startIndex + START_MARKER.length(),
                     endIndex);

      serialBuffer = "";

      msg.trim();

      processSerialConfig(msg);
    }

  }

}

void requestWifiConfig() {
  if (!isConfigured) {
    Serial.println("$GetWifiSet#");
  }
}

/***********************************************************
 *  🌦 Weather API
 **********************************************************/
void getWeatherData() {
  if (city.length() == 0 || city == "null") {
    Serial.println("⚠️ City not set. Skipping weather fetch...");
    return;
  }

  WiFiClient client;
  const char* host = "api.openweathermap.org";

  String url = "/data/2.5/weather?q=" + city;
  if (country.length() > 0) url += "," + country;
  url += "&appid=" + apiKey + "&units=metric";

  if (!client.connect(host, 80)) {
    Serial.println("❌ Weather server connect failed");
    return;
  }

  client.print(String("GET ") + url + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "Connection: close\r\n\r\n");

  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 5000) {
      Serial.println("⏱ Timeout waiting for weather response");
      client.stop();
      return;
    }
  }

  while (client.available()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break;
  }

  String payload = client.readString();

  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.println("❌ JSON parse error in weather data");
    return;
  }

  if (doc.containsKey("cod") && String(doc["cod"]) != "200") {
    Serial.print("⚠️ API error: ");
    Serial.println(String(doc["message"]));
    return;
  }

  String location = doc["name"] | "Unknown";
  float temp = doc["main"]["temp"] | 0.0;
  float hum = doc["main"]["humidity"] | 0.0;
  float wind = doc["wind"]["speed"] | 0.0;
  String status = doc["weather"][0]["main"] | "Unknown";

  Serial.print("$Weather,");
  Serial.print(location);
  Serial.print(",");
  Serial.print(temp, 1);
  Serial.print(",");
  Serial.print(hum, 1);
  Serial.print(",");
  Serial.print(wind, 1);
  Serial.print(",");
  Serial.print(status);
  Serial.println("#");

  client.stop();
}

/***********************************************************
 *  🔄 Setup & Loop
 **********************************************************/
void setup() {
  Serial.begin(115200);
  Serial.println("🟢 Starting program...");

  String savedCity = loadCityFromEEPROM();
  if (savedCity.length() > 0) {
    city = savedCity;
    Serial.print("📂 Loaded city from EEPROM: ");
    Serial.println(city);
  }

  for (int i = 0; i < 17; i++) {
    lastValues17[i] = "";
  }
  for (int i = 0; i < 16; i++) {
    lastValues16[i] = "";
  }
  hasPreviousData17 = false;
  hasPreviousData16 = false;

  wifiPromptTicker.attach(5, requestWifiConfig);
  weatherTicker.attach(60, updateWeatherFlag);
}

void loop() {
  checkSerialInput();

  // ✅ CRITICAL: Continuous WiFi and MQTT monitoring
  monitorWiFiConnection();

  if (isConfigured && mqttClient.connected()) {
    mqttClient.loop();
  }

  // ✅ Handle periodic status reporting
  if (isConfigured) {
    handleStatusReporting();
  }

  if (shouldUpdateWeather && WiFi.status() == WL_CONNECTED) {
    getWeatherData();
    shouldUpdateWeather = false;
  }
}
