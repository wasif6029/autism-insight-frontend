"use client";
 
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import InitialQuery from "./InitialQuery";
import SelectInput from "./SelectInput";
import { useAuth } from "../../../lib/useAuth";
import ResultsDialog from "./setup/ResultsDialog";

export default function DetectionForm() {
  const { user, loading } = useAuth();
  const { register, handleSubmit, reset } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [suggestionsData, setSuggestionsData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/questionsData.json")
      .then((res) => res.json())
      .then(setQuestionsData)
      .catch((err) => console.error("Error loading questions:", err));

    fetch("/suggestionsData.json")
      .then((res) => res.json())
      .then(setSuggestionsData)
      .catch((err) => console.error("Error loading suggestions:", err));
  }, []);

  const videosMutation = useMutation({
    mutationFn: async (videos: FileList) => {
      const formData = new FormData();
      Array.from(videos).forEach((video) => formData.append("videos", video));
      const response = await axios.post(
        "https://primary-problem-guh.sgp.dom.my.id/predict-videos",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
  });

  const imagesMutation = useMutation({
    mutationFn: async (images: FileList) => {
      const formData = new FormData();
      Array.from(images).forEach((image) => formData.append("images", image));
      const response = await axios.post(
        "https://primary-problem-guh.sgp.dom.my.id/predict-images",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
  });

  const formMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post("https://primary-problem-guh.sgp.dom.my.id/predict", data);
      return response.data;
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setModalOpen(true);
    setError(null);
    setResults(null);

    const questions = Object.fromEntries(
      Object.entries(data.questions).map(([key, value]) => [key, Number(value)])
    );

    const formattedData = {
      ...questions,
      Age_Mons: Number(data.age_mons),
      Sex: Number(data.sex),
      Ethnicity: Number(data.ethnicity),
      Jaundice: Number(data.jaundice),
      Family_mem_with_ASD: Number(data.family_mem_with_asd),
    };

    try {
      const [formResult, videosResult, imagesResult] = await Promise.all([
        formMutation.mutateAsync(formattedData),
        data.videos?.length > 0
          ? videosMutation.mutateAsync(data.videos)
          : Promise.resolve(null),
        data.images?.length > 0
          ? imagesMutation.mutateAsync(data.images)
          : Promise.resolve(null),
      ]);

      setResults({
        form: formResult,
        videos: videosResult,
        images: imagesResult,
      });
    } catch (err) {
      setError("Failed to fetch predictions. Please try again.");
    } finally {
      reset();
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-0 my-12">
      {/* Form Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
        <h2 className="text-2xl font-semibold text-center">
          Autism Symptom Detection
        </h2>
        <InitialQuery register={register} />
        <Separator />

        {/* Dynamic Questions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {questionsData?.map((question, index) => (
            <div
              key={question?.id}
              className={`p-2 rounded ${
                index % 2 === 0 ? "bg-blue-100" : "bg-green-100"
              }`}
            >
              <SelectInput
                label={question?.label}
                name={`questions.${question.id}`}
                index={index}
                options={question.options}
                register={register}
                required
              />
            </div>
          ))}
        </div>

        {/* File Uploads */}
        <div>
          <h3 className="text-lg font-semibold">
            Upload Images (png, jpeg, jpg)
          </h3>
          <input
            type="file"
            {...register("images")}
            required
            accept=".png, .jpeg, .jpg"
            multiple
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold">Upload Videos (avi, mp4)</h3>
          <input
            type="file"
            {...register("videos")}
            required
            accept=".avi, .mp4"
            multiple
            className="w-full p-2 border rounded-md"
          />
        </div>

        <Button type="submit" className="w-full">
          Analyze Symptoms
        </Button>
        <Separator />
      </form>

      {/* Modal */}
      <ResultsDialog
        isOpen={modalOpen}
        setIsOpen={setModalOpen}
        isLoading={isLoading}
        error={error}
        results={results}
        suggestionsData={suggestionsData}
        user={user}
      />
    </div>
  );
}
