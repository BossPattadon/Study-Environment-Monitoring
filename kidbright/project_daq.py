from machine import Pin, ADC
import dht
import time
import network
from umqtt.simple import MQTTClient
import json
from config import (WIFI_SSID, WIFI_PASS,
                    MQTT_BROKER, MQTT_USER, MQTT_PASS)

# ── WiFi ─────────────────────────────
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(WIFI_SSID, WIFI_PASS)

print("Connecting to WiFi...")
while not wlan.isconnected():
    time.sleep(0.5)
print("WiFi connected!", wlan.ifconfig())

# ── MQTT ─────────────────────────────
client = MQTTClient(client_id="esp32",
                    server=MQTT_BROKER,
                    user=MQTT_USER,
                    password=MQTT_PASS)

def connect_mqtt():
    try:
        client.connect()
        print("MQTT connected!")
    except:
        print("MQTT failed, retrying...")
        time.sleep(2)
        connect_mqtt()

connect_mqtt()

# ── Sensors ──────────────────────────
pir = Pin(33, Pin.IN)

light = ADC(Pin(34))
light.atten(ADC.ATTN_11DB)

dht_sensor = dht.DHT11(Pin(32))

# Sound sensor
sound = ADC(Pin(35))
sound.atten(ADC.ATTN_0DB)

time.sleep(2)

# ── Sound sampling function ─────────
def read_sound(sensor, samples=50):
    total = 0
    for _ in range(samples):
        total += sensor.read()
        time.sleep_ms(2)
    return total // samples

# ── Timing ──────────────────────────
last_publish = 0
last_pir = 0

# ── Loop ────────────────────────────
while True:
    try:
        now = time.time()

        # ── read sensors ─────────────
        pir_state = pir.value()

        light_value = light.read()
        light_value = int(light_value / 10)  # normalize

        dht_sensor.measure()
        temp = dht_sensor.temperature()
        hum = dht_sensor.humidity()

        noise_value = read_sound(sound)

        # ── payload ─────────────────
        data = {
            "motion": bool(pir_state),
            "light": light_value,
            "temperature": temp,
            "humidity": hum,
            "noise": noise_value
        }

        # ── send every 30 sec ───────
        if now - last_publish >= 30:
            client.publish("b6710545806/sensors", json.dumps(data))
            print("[30s]", data)
            last_publish = now

        # ── send when motion detected (edge trigger) ──
        if pir_state == 1 and last_pir == 0:
            client.publish("b6710545806/sensors", json.dumps(data))
            print("[PIR]", data)

        last_pir = pir_state

    except Exception as e:
        print("Error:", e)
        connect_mqtt()

    time.sleep(2)
