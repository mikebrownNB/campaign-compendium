import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ConfirmEmailProps {
  displayName?: string;
  confirmUrl:   string;
}

export default function ConfirmEmail({ displayName, confirmUrl }: ConfirmEmailProps) {
  const greeting = displayName ? `Welcome, ${displayName}` : 'Welcome, adventurer';

  return (
    <Html>
      <Head />
      <Preview>Confirm your Campaign Compendium account</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Text style={logo}>⚔ Campaign Compendium</Text>
          </Section>

          {/* Body */}
          <Section style={content}>
            <Heading style={h1}>{greeting}</Heading>
            <Text style={paragraph}>
              Your account has been created. Before you can access your campaigns,
              please confirm your email address by clicking the button below.
            </Text>

            <Section style={btnWrapper}>
              <Button href={confirmUrl} style={btn}>
                Confirm Email Address
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={link}>{confirmUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              If you did not create a Campaign Compendium account, you can safely
              ignore this email. This link expires in 24 hours.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#12100d',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  margin: 0,
  padding: '32px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#1c1814',
  border: '1px solid #3a3020',
  borderRadius: '8px',
  maxWidth: '520px',
  margin: '0 auto',
  overflow: 'hidden',
};

const header: React.CSSProperties = {
  backgroundColor: '#12100d',
  borderBottom: '1px solid #3a3020',
  padding: '20px 32px',
};

const logo: React.CSSProperties = {
  color: '#c9a84c',
  fontSize: '16px',
  fontWeight: 'bold',
  letterSpacing: '0.05em',
  margin: 0,
};

const content: React.CSSProperties = {
  padding: '32px',
};

const h1: React.CSSProperties = {
  color: '#e8dcc8',
  fontSize: '22px',
  fontWeight: 'bold',
  marginBottom: '16px',
  marginTop: 0,
};

const paragraph: React.CSSProperties = {
  color: '#b0a090',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const btnWrapper: React.CSSProperties = {
  margin: '24px 0',
  textAlign: 'center',
};

const btn: React.CSSProperties = {
  backgroundColor: '#c9a84c',
  borderRadius: '6px',
  color: '#12100d',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '0.04em',
  padding: '12px 28px',
  textDecoration: 'none',
};

const link: React.CSSProperties = {
  color: '#c9a84c',
  fontSize: '12px',
  letterSpacing: '0.02em',
  margin: '0 0 24px',
  wordBreak: 'break-all',
};

const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #3a3020',
  margin: '24px 0',
};

const footer: React.CSSProperties = {
  color: '#6b5e4e',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: 0,
};
