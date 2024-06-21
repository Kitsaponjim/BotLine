const line = require("@line/bot-sdk");
const express = require("express");
const axios = require("axios").default;
const dotenv = require("dotenv");
dotenv.config();
const env = process.env;
const app = express();

const lineConfig = {
  channelAccessToken: env.ACCESSTOKEN,
  channelSecret: env.SECRET_TOKEN,
};

const client = new line.Client(lineConfig);

let pendingData = {};

const handleEvent = async (event) => {
  console.log(event);
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const user_id = event.source.userId;
  const message = event.message.text;

  if (message.startsWith("ยืนยัน")) {
    const data = pendingData[user_id];
    if (data) {
      try {
        const response = await axios.get(
          "https://script.google.com/macros/s/AKfycbw8AYdTGm-gFBQtUgdaQa7EC1rEuioxDXoULdNEO-k4UF4XgaYC2cB_fkx48kDjLOHw/exec",
          { params: data }
        );
        const result = response.data.result;
        if (result === "added") {
          delete pendingData[user_id];
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: "บันทึกข้อมูลเรียบร้อย",
          });
        } else {
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
          });
        }
      } catch (error) {
        console.error(error);
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์",
        });
      }
    } else {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "ไม่มีข้อมูลที่ต้องการยืนยัน",
      });
    }
  } else {
    const [list, amount, type] = message.split(" ");

    if (!list || !amount || !type) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "รูปแบบข้อความไม่ถูกต้อง กรุณากรอกข้อมูลในรูปแบบ: ประเภท รายการ จำนวน (รายรับ/รายจ่าย)",
      });
    }

    const user_name = await getUserName(user_id);

    pendingData[user_id] = {
      user_id: user_id,
      user_name: user_name,
      list: list,
      expenses: type === "จ่าย" ? amount : '',
      income: type === "รับ" ? amount : '',
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่?\nรายการ: ${list}\nจำนวน: ${amount}\nประเภท: ${type}\nพิมพ์ "ยืนยัน" เพื่อบันทึกข้อมูล`,
    });
  }
};

const getUserName = async (userId) => {
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName;
  } catch (error) {
    console.error(error);
    return "Unknown";
  }
};

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    console.log("event=>>>>", events);
    return events.length > 0
      ? await Promise.all(events.map((item) => handleEvent(item)))
      : res.status(200).send("OK");
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
});

app.listen(4000, () => {
  console.log("listening on 4000");
});
