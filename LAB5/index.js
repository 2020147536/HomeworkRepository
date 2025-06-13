const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 (CSS, 이미지 등) 제공
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// SQLite 데이터베이스 초기화
const dbPath = path.join(__dirname, 'product.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    }
});

// comment.json 파일 경로
const commentFilePath = path.join(__dirname, 'comment.json');

// HTML 템플릿 함수들
const generateHead = (title) => `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="/main.css">
  <title>${title}</title>
</head>
<body>
`;

const generateNav = (currentPage) => `
  <h1 class="title">Welcome to INTERNET-PROGRAMMING MOVIE SITE</h1>
  <p class="nav">
    <a href="/">메인페이지</a>
    <a href="/login">로그인</a>
    <a href="/signup">회원가입</a>
  </p>
`;

const generateFooter = () => `
</body>
</html>
`;

// 메인 페이지 (localhost:3000/)
app.get('/', (req, res) => {
    let htmlContent = generateHead('Main Page');
    htmlContent += generateNav('main');
    htmlContent += `
  <div class="controls">
    <input type="text" id="searchInput" placeholder="영화 제목 검색..." />
    <select id="sortSelect">
      <option value="titleAsc">제목 오름차순</option>
      <option value="titleDesc">제목 내림차순</option>
      <option value="ratingDesc">평점 높은순</option>
      <option value="ratingAsc">평점 낮은순</option>
    </select>
  </div>
  <div id="movieList"></div>

  <template id="movieTemplate">
    <div class="movie-card" data-movie-id="">
      <div class="image-container">
        <img alt="poster" width="100" height="140"/>
        <div class="overlay-text"></div>
      </div>
      <div class="movie-title"></div>
      <div class="movie-rating"></div>
      <div class="movie-date"></div>
    </div>
  </template>

  <script>
    let allMovies = [];
    let filteredMovies = [];
    let index = 0;
    const batchSize = 4;

    const movieList = document.getElementById("movieList");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");

    function renderNextBatch() {
      const fragment = document.createDocumentFragment();
      for (let i = index; i < index + batchSize && i < filteredMovies.length; i++) {
        const movie = filteredMovies[i];
        const template = document.getElementById("movieTemplate").content.cloneNode(true);

        const movieCard = template.querySelector(".movie-card");
        movieCard.dataset.movieId = movie.movie_id;
        movieCard.addEventListener('click', () => {
            window.location.href = \`/movies/\${movie.movie_id}\`;
        });

        const container = template.querySelector(".image-container");
        const img = container.querySelector("img");
        img.src = \`/\${movie.movie_image}\`;
        img.alt = movie.movie_title;
        const overlay = container.querySelector(".overlay-text");
        overlay.style.display = "none";
        template.querySelector(".movie-title").textContent = movie.movie_title;
        template.querySelector(".movie-rating").textContent = \`평점: \${movie.movie_rate}\`;
        template.querySelector(".movie-date").textContent = movie.movie_release_date;
        fragment.appendChild(template);
      }
      index += batchSize;
      movieList.appendChild(fragment);

      // 초기 로드 시 화면이 꽉 차지 않으면 추가 로드
      if (document.body.scrollHeight <= window.innerHeight && index < filteredMovies.length) {
        renderNextBatch();
      }
    }

    window.onscroll = () => {
      if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 100)) { // 하단에서 100px 정도 남았을 때 로드
        renderNextBatch();
      }
    };

    function updateMovies() {
      const keyword = searchInput.value.toLowerCase();
      const sortBy = sortSelect.value;

      filteredMovies = allMovies.filter(movie =>
        movie.movie_title.toLowerCase().includes(keyword)
      );

      if (sortBy === "titleAsc") {
        filteredMovies.sort((a, b) => a.movie_title.localeCompare(b.movie_title));
      } else if (sortBy === "titleDesc") {
        filteredMovies.sort((a, b) => b.movie_title.localeCompare(a.movie_title));
      } else if (sortBy === "ratingAsc") {
        filteredMovies.sort((a, b) => a.movie_rate - b.movie_rate);
      } else if (sortBy === "ratingDesc") {
        filteredMovies.sort((a, b) => b.movie_rate - a.movie_rate);
      }

      index = 0;
      movieList.innerHTML = "";
      renderNextBatch();
    }

    searchInput.addEventListener("input", updateMovies);
    sortSelect.addEventListener("change", updateMovies);

    // 백엔드 API에서 영화 데이터 가져오기
    fetch("/api/movies")
      .then(res => res.json())
      .then(data => {
        allMovies = data;
        updateMovies();
      })
      .catch(err => console.error("데이터 로딩 실패", err));
  </script>
    `;
    htmlContent += generateFooter();
    res.send(htmlContent);
});

// 로그인 페이지 (localhost:3000/login)
app.get('/login', (req, res) => {
    let htmlContent = generateHead('Login Page');
    htmlContent += generateNav('login');
    htmlContent += `
        <form method="POST" action="/login">
            <p>
                <label>아이디:
                <input name = "id" type = "text" placeholder="아이디 입력">
            </label>
            </p>
            <p>
                <label>비밀번호:
                <input name = "password" type = "password" placeholder="비밀번호 입력">
            </label>
            </p>
            <p>
                <input type = "submit" value = "Login">
                <input type = "reset" value = "Cancel">
            </p>
        </form>
    `;
    htmlContent += generateFooter();
    res.send(htmlContent);
});

// 회원가입 페이지 (localhost:3000/signup)
app.get('/signup', (req, res) => {
    let htmlContent = generateHead('SignUp Page');
    htmlContent += generateNav('signup');
    htmlContent += `
        <form method="POST" action="/signup" autocomplete="on">
            <p>
                <label>이름:
                <input name = "name" type = "text" autofocus>
            </label>
            </p>
            <p>
                <label>생일:
                <input name = "date" type = "date">
            </label>
            </p>
            <p>
                성별:
                <label><input name = "sex" type = "radio" value="male">남성</label>
                <label><input name = "sex" type = "radio" value="female">여성</label>
            </p>
            <p>
                <label>학년:
                    <input name = "grade" type = "number" min = "1" max = "4" step = "1" value = "1">
                </label>
            </p>
            <p>
                <label>아이디:
                    <input name = "id" type = "text">
                </label>
            </p>
            <p>
                <label>비밀번호:
                    <input name = "password" type = "password">
                </label>
            </p>
            <p>
                <label>이메일:
                    <input name = "email" type = "email" placeholder = "example@naver.com">
                </label>
            </p>
            <p>
                <label>전화번호:
                    <input name = "tel" type = "tel" pattern = "\\d{3}-\\d{4}-\\d{4}" required>
                </label>
            </p>
            <p>
                <label>보안 질문:
                    <select name = "question">
                        <option value = "default">질문을 선택하세요</option>
                        <option value = "좋아하는 캐릭터 이름은?">좋아하는 캐릭터 이름은?</option>
                        <option value = "출신 초등학교는?">출신 초등학교는?</option>
                        <option value = "어머니 성함은?">어머니 성함은?</option>
                        <option value = "가장 친한 친구 이름은?">가장 친한 친구 이름은?</option>
                    </select>
                </label>
            </p>
            <p>
                <label>답변:
                    <input name = "answer" type = "text" autocomplete="off">
                </label>
            </p>
            <p>
                <input type = "submit" value = "Submit">
                <input type = "reset" value = "Clear">
            </p>
        </form>
    `;
    htmlContent += generateFooter();
    res.send(htmlContent);
});

// 영화 데이터 가져오기 API
app.get('/api/movies', (req, res) => {
    const query = 'SELECT * FROM movies';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 특정 영화 상세 정보 가져오기 및 영화 상세 페이지 렌더링
app.get('/movies/:movie_id', (req, res) => {
    const movieId = req.params.movie_id;
    const query = 'SELECT * FROM movies WHERE movie_id = ?';

    db.get(query, [movieId], (err, movie) => {
        if (err) {
            res.status(500).send('<h1>서버 오류: ' + err.message + '</h1>');
            return;
        }
        if (!movie) {
            res.status(404).send('<h1>영화를 찾을 수 없습니다.</h1>');
            return;
        }

        // comment.json에서 해당 영화의 댓글 가져오기
        fs.readFile(commentFilePath, 'utf8', (err, data) => {
            let comments = {};
            if (!err) {
                try {
                    comments = JSON.parse(data);
                } catch (e) {
                    console.error('comment.json 파싱 오류:', e);
                }
            }
            const movieComments = comments[movieId] || [];

            let htmlContent = generateHead(movie.movie_title);
            htmlContent += generateNav();
            htmlContent += `
            <div class="movie-detail-container" style="max-width: 1020px; margin: 20px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h2 style="text-align: center;">${movie.movie_title}</h2>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                    <img src="/${movie.movie_image}" alt="${movie.movie_title}" style="max-width: 300px; height: auto; border-radius: 8px;">
                    <div style="text-align: left; width: 100%;">
                        <p><strong>영화 ID:</strong> ${movie.movie_id}</p>
                        <p><strong>영화 제목:</strong> ${movie.movie_title}</p>
                        <p><strong>개봉일:</strong> ${movie.movie_release_date}</p>
                        <p><strong>평점:</strong> ${movie.movie_rate} / 10</p>
                        <p><strong>줄거리:</strong> ${movie.movie_overview}</p>
                    </div>
                </div>

                <hr style="margin: 30px 0;">

                <h3>영화 후기</h3>
                <div id="comments-section">
                    ${movieComments.length > 0 ? movieComments.map(comment => `<p>- ${comment}</p>`).join('') : '<p>아직 후기가 없습니다.</p>'}
                </div>

                <h4 style="margin-top: 20px;">새로운 후기 작성</h4>
                <form id="comment-form" style="display: flex; flex-direction: column; gap: 10px;">
                    <textarea id="comment-text" rows="4" placeholder="후기를 작성하세요" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    <button type="submit" style="padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">등록하기!</button>
                </form>
            </div>

            <script>
                const commentForm = document.getElementById('comment-form');
                const commentText = document.getElementById('comment-text');
                const commentsSection = document.getElementById('comments-section');
                const movieId = ${movieId}; // 서버에서 movie_id를 주입

                commentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const newComment = commentText.value.trim();

                    if (newComment) {
                        try {
                            const response = await fetch('/api/comments', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ movieId, comment: newComment })
                            });

                            const result = await response.json();
                            if (result.success) {
                                // 댓글 섹션을 업데이트 (간단하게 페이지 새로고침)
                                location.reload();
                                // 또는 동적으로 추가 (좀 더 복잡)
                                // if (commentsSection.querySelector('p') && commentsSection.querySelector('p').textContent === '아직 후기가 없습니다.') {
                                //     commentsSection.innerHTML = '';
                                // }
                                // const p = document.createElement('p');
                                // p.textContent = \`- \${newComment}\`;
                                // commentsSection.appendChild(p);
                                // commentText.value = '';
                            } else {
                                alert('댓글 등록 실패: ' + result.message);
                            }
                        } catch (error) {
                            console.error('댓글 전송 오류:', error);
                            alert('댓글을 등록하는 중 오류가 발생했습니다.');
                        }
                    } else {
                        alert('후기 내용을 입력해주세요.');
                    }
                });
            </script>
            `;
            htmlContent += generateFooter();
            res.send(htmlContent);
        });
    });
});

// 댓글 추가 API (POST 요청)
app.post('/api/comments', (req, res) => {
    const { movieId, comment } = req.body;

    if (!movieId || !comment) {
        return res.status(400).json({ success: false, message: '영화 ID와 댓글 내용이 필요합니다.' });
    }

    fs.readFile(commentFilePath, 'utf8', (err, data) => {
        let comments = {};
        if (!err) {
            try {
                comments = JSON.parse(data);
            } catch (e) {
                console.error('comment.json 파싱 오류:', e);
            }
        }

        if (!comments[movieId]) {
            comments[movieId] = [];
        }
        comments[movieId].push(comment);

        fs.writeFile(commentFilePath, JSON.stringify(comments, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('comment.json 쓰기 오류:', err);
                return res.status(500).json({ success: false, message: '댓글 저장 실패' });
            }
            res.json({ success: true, message: '댓글이 성공적으로 등록되었습니다.' });
        });
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});