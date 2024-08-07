import { useState } from "react";
import "./App.css";
import AWS from "aws-sdk";
import { GoogleSpreadsheet } from "google-spreadsheet";

function App() {
  const langList = ["kor", "en", "jp", "ch"];
  const [list, setList] = useState<string[]>([]);

  async function uploadJson() {
    const env = import.meta.env;

    const SHEET_ID = env.VITE_SHEET_ID;
    const API_KEY = env.VITE_GOOGLE_SHEETS_API_KEY;

    const AWS_ACCESS_KEY_ID = env.VITE_AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY_ID = env.VITE_AWS_SECRET_ACCESS_KEY_ID;
    const AWS_REGION = env.VITE_AWS_REGION;

    if (!SHEET_ID || !API_KEY) {
      return;
    }

    const doc = new GoogleSpreadsheet(SHEET_ID, {
      apiKey: API_KEY,
    });

    await doc.loadInfo();

    const sheets = doc.sheetCount;
    for (let i = 0; i < sheets; i++) {
      setList([]);
      const sheet = doc.sheetsByIndex[i];
      await sheet.loadCells();
      const rows = await sheet.getRows();

      const langs = sheet.headerValues;

      langs.forEach((language, index) => {
        const jsonData: { [key: string]: string } = {};
        if (!langList.includes(language)) return;
        for (let j = 1; j < rows.length + 1; j++) {
          const key: string = sheet.getCell(j, 0).value as string;
          jsonData[key] = sheet.getCell(j, index).value as string;
        }

        const jsonString = JSON.stringify(jsonData, null, 2);
        // AWS S3 설정
        AWS.config.update({
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY_ID,
          region: AWS_REGION, // 리전 변경
        });

        const s3 = new AWS.S3();

        // 업로드할 파일 정보 설정
        const uploadParams = {
          Bucket: "t-lang", // 버킷 이름 변경
          Key: `${language}.json`, // S3에 저장될 경로와 파일명
          Body: jsonString,
          ContentType: "application/json",
        };

        // S3에 파일 업로드
        s3.upload(uploadParams, (err: any) => {
          if (err) {
            setList((prev) => [...prev, `${language} 생성에러`]);
          } else {
            setList((prev) => [...prev, language]);
          }
        });
      });
    }
  }

  return (
    <div>
      <button onClick={uploadJson}>Upload</button>
      <ul>
        {list.map((lnag: string, idx: number) => (
          <li key={idx}>{lnag}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
