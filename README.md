### 📌 각 기능 별 Branch 개발 방법
```bash
# git clone
git clone https://github.com/wjy4ng/web_programming.git
cd web_programming

# develop 브랜치 생성
git checkout -b develop
or
git switch -C develop

# 작업, 커밋
git add .
git commit -m "[250526] Update: 코드 수정"
git push origin develop

# main으로 돌아가서 merge
git checkout main
git pull origin main
git merge develop
git push origin main

# develop 브랜치 로컬/원격 삭제 (원격은 필수)
git branch -d develop
git push origin --delete develop
```
