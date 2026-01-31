import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';

const RegistrationForm = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
    const [firmaPreview, setFirmaPreview] = useState(null);
    const [voucherPreview, setVoucherPreview] = useState(null);

    const programs = [
        "Administración",
        "Contabilidad",
        "Derecho",
        "Ingeniería de Sistemas",
        "Psicología"
    ];

    const onSubmit = async (data) => {
        const formData = new FormData();
        formData.append('dni', data.dni);
        formData.append('nombre', data.nombre);
        formData.append('email', data.email);
        formData.append('telefono', data.telefono);
        formData.append('domicilio', data.domicilio);
        formData.append('programa', data.programa);

        if (data.firma[0]) formData.append('firma', data.firma[0]);
        if (data.voucher[0]) formData.append('voucher', data.voucher[0]);

        try {
            // Use relative URL for portability. The proxy (dev) or server (prod) will handle it.
            await axios.post('/api/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('¡Inscripción recibida! Estamos procesando tu matrícula.');
            reset();
            setFirmaPreview(null);
            setVoucherPreview(null);
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al enviar la inscripción.';
            toast.error(msg);
        }
    };

    const handleDisplayFile = (e, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setPreview(URL.createObjectURL(file));
            } else {
                setPreview('PDF Selected');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Ficha de Matrícula
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Complete todos los campos requeridos
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="rounded-md shadow-sm -space-y-px">

                        {/* Program */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Programa *</label>
                            <select
                                {...register("programa", { required: "Seleccione un programa" })}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                            >
                                <option value="">Seleccione...</option>
                                {programs.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            {errors.programa && <p className="text-red-500 text-xs mt-1">{errors.programa.message}</p>}
                        </div>

                        {/* DNI */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">DNI *</label>
                            <input
                                type="text"
                                {...register("dni", {
                                    required: "DNI es requerido",
                                    pattern: { value: /^\d{8}$/, message: "DNI debe tener 8 dígitos" }
                                })}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                            {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni.message}</p>}
                        </div>

                        {/* Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Nombre Completo *</label>
                            <input
                                type="text"
                                {...register("nombre", {
                                    required: "Nombre es requerido",
                                    validate: value => value.trim().split(/\s+/).length >= 3 || "Ingrese nombres y apellidos completos (min 3 palabras)"
                                })}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                        </div>

                        {/* Email */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Email *</label>
                            <input
                                type="email"
                                {...register("email", { required: "Email es requerido", pattern: { value: /^\S+@\S+$/i, message: "Email inválido" } })}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Phone */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Celular *</label>
                            <input
                                type="tel"
                                {...register("telefono", {
                                    required: "Celular es requerido",
                                    pattern: { value: /^9\d{8}$/, message: "Celular inválido (9XXXXXXXX)" }
                                })}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                            {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
                        </div>

                        {/* Address */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Domicilio *</label>
                            <input
                                type="text"
                                {...register("domicilio", { required: "Domicilio es requerido", minLength: { value: 10, message: "Mínimo 10 caracteres" } })}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3"
                            />
                            {errors.domicilio && <p className="text-red-500 text-xs mt-1">{errors.domicilio.message}</p>}
                        </div>

                        {/* Signature */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Firma (Imagen) *</label>
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                {...register("firma", { required: "Firma es requerida" })}
                                onChange={(e) => {
                                    register("firma").onChange(e);
                                    handleDisplayFile(e, setFirmaPreview);
                                }}
                                className="mt-1 block w-full"
                            />
                            {firmaPreview && (
                                <div className="mt-2 text-sm text-gray-500">
                                    Previsualización:
                                    <img src={firmaPreview} alt="Firma" className="mt-1 h-20 object-contain border" />
                                </div>
                            )}
                            {errors.firma && <p className="text-red-500 text-xs mt-1">{errors.firma.message}</p>}
                        </div>

                        {/* Voucher */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Voucher (Img/PDF) *</label>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, application/pdf"
                                {...register("voucher", { required: "Voucher es requerido" })}
                                onChange={(e) => {
                                    register("voucher").onChange(e);
                                    handleDisplayFile(e, setVoucherPreview);
                                }}
                                className="mt-1 block w-full"
                            />
                            {voucherPreview && (
                                <div className="mt-2 text-sm text-gray-500">
                                    Previsualización: {voucherPreview === 'PDF Selected' ? '📄 Documento PDF cargado' : (
                                        <img src={voucherPreview} alt="Voucher" className="mt-1 h-32 object-contain border" />
                                    )}
                                </div>
                            )}
                            {errors.voucher && <p className="text-red-500 text-xs mt-1">{errors.voucher.message}</p>}
                        </div>

                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        >
                            {isSubmitting ? 'Enviando...' : 'Enviar Inscripción'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationForm;
