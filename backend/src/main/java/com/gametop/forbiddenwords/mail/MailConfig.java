package com.gametop.forbiddenwords.mail;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import com.gametop.forbiddenwords.config.AppProperties;

/**
 * เลือกวิธีส่งอีเมล: มี Brevo API key → ส่งจริง · ไม่มีแต่เปิด log-links (dev) → พิมพ์ลง log · ไม่งั้นปิด
 */
@Configuration
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    public Mailer mailer(AppProperties props) {
        AppProperties.Mail mail = props.mail();
        if (mail.apiEnabled()) {
            RestClient http = RestClient.builder().baseUrl("https://api.brevo.com/v3").build();
            return new Mailer() {
                @Override
                public boolean enabled() {
                    return true;
                }

                @Override
                public void send(String to, String subject, String html) {
                    http.post().uri("/smtp/email")
                            .header("api-key", mail.brevoApiKey())
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(Map.of(
                                    "sender", Map.of("email", mail.from(), "name", mail.fromName()),
                                    "to", List.of(Map.of("email", to)),
                                    "subject", subject,
                                    "htmlContent", html))
                            .retrieve()
                            .toBodilessEntity();
                }
            };
        }
        boolean logLinks = mail.logLinks();
        return new Mailer() {
            @Override
            public boolean enabled() {
                return logLinks;
            }

            @Override
            public void send(String to, String subject, String html) {
                if (logLinks) {
                    log.info("[dev] อีเมลถึง {} — {}\n{}", to, subject, html);
                }
            }
        };
    }
}
