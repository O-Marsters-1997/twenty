import { Locator, Page } from '@playwright/test';

export class SecuritySection {
  private readonly googleToggle: Locator;
  private readonly passwordToggle: Locator;
  private readonly inviteByLinkToggle: Locator;

  constructor(public readonly page: Page) {
    this.googleToggle = page.getByLabel('Google');
    this.passwordToggle = page.getByLabel('Password');
    this.inviteByLinkToggle = page.getByLabel('Invite by Link');
  }

  async toggleGoogle() {
    await this.googleToggle.click();
  }

  async togglePassword() {
    await this.passwordToggle.click();
  }

  async toggleInviteByLink() {
    await this.inviteByLinkToggle.click();
  }
}
