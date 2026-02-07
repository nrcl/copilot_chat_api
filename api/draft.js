export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { device_id, history, adminDraft } = req.body;

    try {
        // 1. ตรวจสอบสิทธิ์จาก Google Sheet (Column A: ID, Column B: Name)
        const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; 
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
        
        const sheetResponse = await fetch(sheetUrl);
        const csvData = await sheetResponse.text();
        
        const rows = csvData.split('\n');
        const allowedIds = rows.map(row => row.split(',')[0].replace(/"/g, '').trim());

        if (!allowedIds.includes(device_id)) {
            return res.status(403).json({ 
                error: 'Unauthorized', 
                message: `เครื่องยังไม่ได้รับอนุญาต (ID: ${device_id}) กรุณาแจ้ง Admin เพื่อลงทะเบียน` 
            });
        }

        // 2. Prompt กลางสำหรับผู้ช่วย Admin
        const systemInstruction = `คุณคือผู้ช่วยแอดมินตอบแชท ภารกิจคือ "เสริมสิ่งที่ขาด" เพื่อปิดการขาย โดยห้ามพูดซ้ำเรื่องที่แจ้งไปแล้วในแชท

        กฎหลักในการตอบ:
        1. กรณีแนะนำสินค้ากว้างๆ: ให้ส่งข้อมูลประกอบการตัดสินใจ ห้ามเดารุ่น/ราคาเอง ให้ใช้รูปแบบ:
           - ชื่อสินค้า: XXXXXXXXXXXX
           - ราคา: YYYYY
           - รายละเอียด: https://ZZZZZZZZZZZZZZZZZZZZZZZ
        2. กรณีระบุรุ่นแล้ว: พยายามปิดการขาย ลด Friction (เช่น แจ้งว่ามีของเลย, ส่งฟรี, แถมเมม)
        3. กรณีจะซื้อ: ส่งเลขบัญชี/ช่องทางชำระเงิน และถามที่อยู่จัดส่งหรือนัดรับ
        4. การป้ายยา: เมื่อจะซื้อ ให้เสนออุปกรณ์เสริม (แบต, เมม) และประกันเพิ่ม 3 ปี รวมอุบัติเหตุ (8%) สำหรับกล้องทุกรุ่น
        5. กรณีสินค้าหมด: ขอโทษ + อธิบายสาเหตุ + เสนอทางเลือกอื่นอย่างกระตือรือร้น
        6. การยึดลูกค้า: ถ้าของหมด ให้ขอเบอร์ติดต่อแจ้งกลับ หรือเสนอมัดจำเพื่อล็อคคิว
        
        *หมายเหตุ: สุภาพ เป็นกันเอง ห้าม Recap เรื่องเดิม และร่างเฉพาะข้อความตอบกลับถัดไปเพียงข้อความเดียว ห้ามเล่นละครโต้ตอบเอง*`;

        // 3. เรียก OpenAI API
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` 
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: adminDraft ? `Admin Draft: ${adminDraft}\nChat Context: ${history}` : `Chat Context: ${history}` }
                ],
                temperature: 0.3
            })
        });

        const data = await aiResponse.json();
        res.status(200).json({ suggestion: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
