import express from 'express';
import cors from 'cors';
import parseRouter from './routes/parse.route';

const app = express();
const PORT = 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우터 마운트
app.use('/api/parse', parseRouter);

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});