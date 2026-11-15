<?php
declare(strict_types=1);

final class Mailer
{
    public static function send(string $to, string $subject, string $html): bool
    {
        $brevoKey = $_ENV['BREVO_API_KEY'] ?? '';
        $from = $_ENV['MAIL_FROM'] ?? 'noreply@zola.africa';

        if ($brevoKey !== '') {
            $ch = curl_init('https://api.brevo.com/v3/smtp/email');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'api-key: ' . $brevoKey,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'sender' => ['name' => 'ZOLA', 'email' => $from],
                    'to' => [['email' => $to]],
                    'subject' => $subject,
                    'htmlContent' => $html,
                ]),
            ]);
            curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            return $code >= 200 && $code < 300;
        }

        $headers = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\nFrom: ZOLA <{$from}>\r\n";
        return @mail($to, $subject, $html, $headers);
    }
}
