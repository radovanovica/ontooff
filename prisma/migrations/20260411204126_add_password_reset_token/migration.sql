-- AddColumn passwordResetToken and passwordResetExpires to users
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "users_passwordResetToken_key" ON "users"("passwordResetToken");
