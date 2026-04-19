const studyIndexModel = require("../models/studyIndex.model");
const sensorModel = require("../models/sensor.model");
const iqAirModel = require("../models/iqAir.model");

// ฟังก์ชันสำหรับแปลงค่าดิบเป็นคะแนน 0-100
const calculateScore = (value, minPerfect, maxPerfect, weight = 1) => {
  // Logic ง่ายๆ: ถ้าอยู่ในช่วงที่เหมาะสมได้ 100 ถ้าห่างออกไปคะแนนจะลดลง
  if (value >= minPerfect && value <= maxPerfect) return 100;
  const deviation = Math.min(Math.abs(value - (minPerfect + maxPerfect) / 2), 20);
  return Math.max(0, 100 - deviation * 2);
};

exports.generateCurrentIndex = async () => {
  try {
    // 1. ดึงข้อมูลล่าสุด
    const sensor = await sensorModel.findLatest();
    const aqi = await iqAirModel.findLatest();

    if (!sensor) return null;

    // 2. Scoring Logic (อ้างอิงจากไฟล์ CSV ของคุณ)
    
    // Light Score: อ้างอิง adcToLux (200-500 lux เหมาะกับการอ่านหนังสือ)
    // ใน CSV ค่า analog ~200 แปลงเป็น lux จะได้ราวๆ 200 ซึ่งถือว่าเริ่มมืด
    const light_score = sensor.light_level > 250 ? 100 : 70;

    // Noise Score: ค่า analog ใน CSV ~600-610 คือเงียบมาก
    // ถ้าค่าเกิน 650 (เริ่มดัง) คะแนนจะลดลง
    const noise_score = sensor.noise_level < 620 ? 100 : 40;

    // Temp Score: 23-26 องศาคือจุดที่สมองทำงานได้ดีที่สุด
    const temp_score = calculateScore(sensor.temperature, 23, 26);

    // Humidity Score: 40-60% คือค่ามาตรฐาน
    const humidity_score = calculateScore(sensor.humidity, 40, 60);

    // AQI Score (External Data): IQAir US AQI < 50 คือดีมาก
    const aqi_score = aqi && aqi.aqi_us < 50 ? 100 : 60;

    // 3. คำนวณคะแนนรวม (Total Score)
    // ให้ค่าน้ำหนัก (Weight): แสงและเสียงมีผลต่อสมาธิมากที่สุด
    const total_score = (
      (light_score * 0.3) + 
      (noise_score * 0.3) + 
      (temp_score * 0.15) + 
      (humidity_score * 0.1) + 
      (aqi_score * 0.15)
    ).toFixed(2);

    // 4. สรุปสถานะ
    let status = "Good";
    if (total_score < 50) status = "Poor";
    else if (total_score < 80) status = "Moderate";

    // 5. บันทึกลง Database
    const finalData = {
      pir_score: sensor.pir_motion ? 100 : 0,
      light_score,
      temp_score,
      humidity_score,
      noise_score,
      total_score,
      status,
      timestamp: new Date()
    };

    return await studyIndexModel.create(finalData);
  } catch (error) {
    console.error("Scoring Error:", error);
    throw error;
  }
};