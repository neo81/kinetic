import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const response = http.get('http://127.0.0.1:3000/');

  check(response, {
    'status es 200': (res) => res.status === 200,
    'html contiene root': (res) => res.body.includes('id="root"'),
  });

  sleep(1);
}
