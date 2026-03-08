# Contributing to GovSaathi AI

Thank you for your interest in contributing to GovSaathi AI! This project aims to help millions of Indian citizens discover government welfare schemes through AI.

## How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs
- Include detailed steps to reproduce
- Provide AWS region and service versions
- Share relevant CloudWatch Logs (sanitized)

### Suggesting Features
- Open a GitHub Issue with the "enhancement" label
- Describe the use case and expected behavior
- Consider budget impact ($150 constraint)
- Align with project mission (accessibility, rural reach)

### Code Contributions

#### Setup Development Environment
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/govsaathi-ai.git
cd govsaathi-ai

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

#### Making Changes
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Update documentation
6. Commit with clear messages (`git commit -m 'Add amazing feature'`)
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request

#### Code Style
- Follow existing TypeScript conventions
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Write unit tests for new features

#### Testing
- Run `npm test` before committing
- Add tests for new features
- Ensure all tests pass
- Test with real AWS services when possible

### Documentation
- Update relevant .md files
- Keep README.md current
- Document new API endpoints
- Add examples for new features

### Cost Considerations
- All changes must respect the $150 budget
- Document cost impact of new features
- Optimize for cost efficiency
- Use caching where possible

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize user needs (rural citizens)
- Maintain professional communication

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Publishing private information
- Unethical use of AI/data

## Questions?

Open a GitHub Discussion or Issue for:
- Architecture questions
- AWS service selection
- Cost optimization ideas
- Feature proposals

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make government services more accessible! 🇮🇳**
