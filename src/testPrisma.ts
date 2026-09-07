import { prisma } from "./db";

async function main() {
  const users = await prisma.user.findMany();

  console.log("DB接続成功！");
  console.log(users);
}

main()
  .catch((error) => {
    console.error("DB接続失敗！");
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
