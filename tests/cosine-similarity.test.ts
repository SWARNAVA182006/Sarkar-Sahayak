import { describe, test, expect } from '@jest/globals';

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

describe('Cosine Similarity', () => {
  test('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
  });

  test('should return 0 for orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
  });

  test('should return -1 for opposite vectors', () => {
    const vecA = [1, 2, 3];
    const vecB = [-1, -2, -3];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
  });

  test('should calculate similarity for random vectors', () => {
    const vecA = [0.5, 0.3, 0.2];
    const vecB = [0.6, 0.25, 0.15];
    const similarity = cosineSimilarity(vecA, vecB);
    expect(similarity).toBeGreaterThan(0.9);
    expect(similarity).toBeLessThanOrEqual(1.0);
  });

  test('should throw error for different length vectors', () => {
    const vecA = [1, 2, 3];
    const vecB = [1, 2];
    expect(() => cosineSimilarity(vecA, vecB)).toThrow('Vectors must have same length');
  });
});
